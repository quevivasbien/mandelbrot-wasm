importScripts("./pkg/mandelbrot_wasm.js");

const { compute_grid } = wasm_bindgen;

let my_id;

async function init_worker(id) {
    my_id = id;
    await wasm_bindgen("./pkg/mandelbrot_wasm_bg.wasm");

    postMessage({ id: my_id, type: "ready" });
}

onmessage = function(event) {
    if (event.data.type === "init") {
        init_worker(event.data.id);
    }
    else if (event.data.type === "compute") {
        console.log("computing in worker", my_id);
        const { _, order, width, height, x0, y0, x1, y1, offset } = event.data;
        const cells = compute_grid(
            width, height, x0, y0, x1, y1
        );
        postMessage({ id: my_id, order: order, type: "result", cells: cells, width: width, height: height, offset: offset });
    }
}
