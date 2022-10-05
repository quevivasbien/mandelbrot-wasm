const canvas = document.getElementById("canvas");
canvas.width = 0.8 * window.innerWidth;
canvas.height = 0.8 * window.innerHeight;
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const workers = [];
const n_workers = window.navigator.hardwareConcurrency;

const MOVE_STEP = 0.1;
const ZOOM_STEP = 2;

function scale_pos_to_canvas(pos) {
    const scale = canvas.height / canvas.width;
    const old_scale = (pos.y1 - pos.y0) / (pos.x1 - pos.x0);
    // stretch vertically
    const y_center = (pos.y0 + pos.y1) / 2;
    const y_rad = (pos.y1 - pos.y0) / 2;
    return {
        x0: pos.x0,
        y0: y_center - y_rad * scale / old_scale,
        x1: pos.x1,
        y1: y_center + y_rad * scale / old_scale,
    };
}

let pos = scale_pos_to_canvas({
    x0: -2.5,
    y0: -2.0,
    x1: 1.5,
    y1: 2.0,
});

let resizing = false;
window.addEventListener("resize", () => {
    if (resizing) {
        return;
    }
    resizing = true;
    canvas.width = 0.8 * window.innerWidth;
    canvas.height = 0.8 * window.innerHeight;
    pos = scale_pos_to_canvas(pos);
    setTimeout(
        () => {
            resizing = false;
            compute_all();
        },
        500
    )
});

let current_order = 0;
let last_order_received = 0;
const order_log = [];

function empty_log() {
    for (let i = 0; i < order_log.length; i++) {
        if (order_log[i].original.order === last_order_received + 1) {
            update_canvas(order_log[i]);
            last_order_received++;
            order_log.splice(i, 1);
            // look for next order
            empty_log();
            // don't keep looking in this version of the log
            return;
        }
    }
    // if reach here, means next item not in log
}

function on_worker_message(event) {
    if (event.data.type === "result") {
        if (event.data.original.order === last_order_received + 1) {
            update_canvas(event.data);
            last_order_received++;
        }
        else {
            order_log.push(event.data);
        }
        empty_log();
    }
    workers[event.data.id].ready = true;
}

function init_workers() {
    for (let i = 0; i < n_workers; i++) {
        const worker = new Worker("./worker.js");
        worker.addEventListener("message", on_worker_message);
        workers.push(
            { worker: worker, ready: false }    
        );
        worker.postMessage({ type: "init", id: i });
    }
}

function update_canvas(data) {
    let img_data = ctx.createImageData(
        data.original.width, data.original.height
    );
    img_data.data.set(data.cells, 0);
    // figure out horizontal and vertical offsets
    const start_x = canvas.width * (data.original.x0 - pos.x0) / (pos.x1 - pos.x0);
    const start_y = canvas.height * (data.original.y0 - pos.y0) / (pos.y1 - pos.y0);
    ctx.putImageData(img_data, start_x, start_y);
}

async function find_ready_worker() {
    let worker_id = -1;
    function loop_i() {
        for (let i = 0; i < workers.length; i++) {
            if (workers[i].ready) {
                worker_id = i;
                break;
            }
        }
    }
    while (worker_id === -1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        loop_i();
    }
    return worker_id;
}

async function compute_cells(
    width, height,
    x0, y0, x1, y1
) {
    let worker_id = await find_ready_worker();
    workers[worker_id].ready = false;
    workers[worker_id].worker.postMessage({
        type: "compute",
        order: ++current_order,
        width: width,
        height: height,
        x0: x0,
        y0: y0,
        x1: x1,
        y1: y1,
    });
}

function compute_all(retry = false) {
    const row_step = Math.floor(canvas.height / n_workers);
    const row_remainder = canvas.height % n_workers;
    const vert_scale = (pos.y1 - pos.y0) / canvas.height;
    for (let i = 0; i < n_workers; i++) {
        let my_row_step = row_step + ((i === 0) ? row_remainder : 0);
        let my_y0 = pos.y0 + i * row_step * vert_scale;
        let my_y1 = my_y0 + my_row_step * vert_scale;
        compute_cells(
            canvas.width, my_row_step,
            pos.x0, my_y0, pos.x1, my_y1
        );
    }
}

function move_down() {
    const move_rows = Math.floor(canvas.height * MOVE_STEP); 
    const move_amt = move_rows * (pos.y1 - pos.y0) / canvas.height;
    pos.y0 += move_amt;
    pos.y1 += move_amt;
    const img_data = ctx.getImageData(0, move_rows, canvas.width, canvas.height - move_rows);
    ctx.putImageData(img_data, 0, 0);
    const offset = (canvas.height - move_rows) * canvas.width * 4;
    compute_cells(
        canvas.width, move_rows,
        pos.x0, pos.y1 - move_amt, pos.x1, pos.y1
    );
}

function move_up() {
    const move_rows = Math.floor(canvas.height * MOVE_STEP); 
    const move_amt = move_rows * (pos.y1 - pos.y0) / canvas.height;
    pos.y0 -= move_amt;
    pos.y1 -= move_amt;
    const img_data = ctx.getImageData(0, 0, canvas.width, canvas.height - move_rows);
    ctx.putImageData(img_data, 0, move_rows);
    compute_cells(
        canvas.width, move_rows,
        pos.x0, pos.y0, pos.x1, pos.y0 + move_amt
    );
}

function move_right() {
    const move_cols = Math.floor(canvas.width * MOVE_STEP); 
    const move_amt = move_cols * (pos.x1 - pos.x0) / canvas.width;
    pos.x0 += move_amt;
    pos.x1 += move_amt;
    const img_data = ctx.getImageData(move_cols, 0, canvas.width - move_cols, canvas.height);
    ctx.putImageData(img_data, 0, 0);
    compute_cells(
        move_cols, canvas.height,
        pos.x1 - move_amt, pos.y0, pos.x1, pos.y1
    );
}

function move_left() {
    const move_cols = Math.floor(canvas.width * MOVE_STEP);
    const move_amt = move_cols * (pos.x1 - pos.x0) / canvas.width;
    pos.x0 -= move_amt;
    pos.x1 -= move_amt;
    const img_data = ctx.getImageData(0, 0, canvas.width - move_cols, canvas.height);
    ctx.putImageData(img_data, move_cols, 0);
    compute_cells(
        move_cols, canvas.height,
        pos.x0, pos.y0, pos.x0 + move_amt, pos.y1
    );
}

function zoom_in() {
    // check that all workers are ready before allowing this
    if (workers.some(w => !w.ready)) {
        return;
    }
    // create temporary zoomed-in image
    const image_center = ctx.getImageData(
        canvas.width / (ZOOM_STEP * 2),
        canvas.height / (ZOOM_STEP * 2),
        canvas.width / ZOOM_STEP,
        canvas.height / ZOOM_STEP
    );
    ctx.putImageData(image_center, 0, 0);
    ctx.drawImage(
        canvas,
        0, 0,
        canvas.width / ZOOM_STEP, canvas.height / ZOOM_STEP,
        0, 0,
        canvas.width, canvas.height
    );
    // update image coordinates and call compute_all
    const new_xrad = (pos.x1 - pos.x0) / (ZOOM_STEP * 2);
    const new_yrad = (pos.y1 - pos.y0) / (ZOOM_STEP * 2);
    const x_center = (pos.x0 + pos.x1) / 2;
    const y_center = (pos.y0 + pos.y1) / 2;
    pos.x0 = x_center - new_xrad;
    pos.x1 = x_center + new_xrad;
    pos.y0 = y_center - new_yrad;
    pos.y1 = y_center + new_yrad;
    compute_all();
}

function zoom_out() {
    // check that all workers are ready before allowing this
    if (workers.some(w => !w.ready)) {
        return;
    }
    ctx.drawImage(
        canvas, 0, 0,
        canvas.width, canvas.height,
        canvas.width / (ZOOM_STEP * 2), canvas.height / (ZOOM_STEP * 2),
        canvas.width / ZOOM_STEP,
        canvas.height / ZOOM_STEP
    );
    const new_xrad = (pos.x1 - pos.x0) * (ZOOM_STEP / 2);
    const new_yrad = (pos.y1 - pos.y0) * (ZOOM_STEP / 2);
    const x_center = (pos.x0 + pos.x1) / 2;
    const y_center = (pos.y0 + pos.y1) / 2;
    // update image coordinates
    pos.x0 = x_center - new_xrad;
    pos.x1 = x_center + new_xrad;
    pos.y0 = y_center - new_yrad;
    pos.y1 = y_center + new_yrad;
    // draw new image
    compute_all();
}

document.onkeydown = function(e) {
    switch (e.key) {
        case 'w': move_up(); break;
        case 's': move_down(); break;
        case 'a': move_left(); break;
        case 'd': move_right(); break;
        case 'q': zoom_out(); break;
        case 'e': zoom_in(); break;
    }
}

init_workers();
compute_all();
