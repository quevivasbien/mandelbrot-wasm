importScripts("./pkg/mandelbrot_wasm.js");

const { compute_grid, Colors } = wasm_bindgen;

let my_id;
let colors;

async function init_worker(id) {
    my_id = id;
    await wasm_bindgen("./pkg/mandelbrot_wasm_bg.wasm");
    colors = Colors.default();

    postMessage({ id: my_id, type: "ready" });
}

onmessage = function(event) {
    if (event.data.type === "init") {
        init_worker(event.data.id);
    }
    else if (event.data.type === "compute") {
        const cells = compute_grid(
            event.data.width, event.data.height,
            event.data.x0, event.data.y0, event.data.x1, event.data.y1,
            colors
        );
        postMessage({ id: my_id, type: "result", cells: cells, original: event.data });
    }
}
