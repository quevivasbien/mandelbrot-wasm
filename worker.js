importScripts("./wasm/wasm.js");
const { Colors, compute_grid } = wasm_bindgen;

function initWorker() {
    wasm_bindgen("./wasm/wasm_bg.wasm").then(() => {
        self.addEventListener(
            "message",
            e => {
                const data = e.data;
                const colors = Colors.new(
                    data.colors[0], data.colors[1],
                    data.colors[2], data.colors[3],
                    data.colors[4], data.colors[5],
                );
                const result = {
                    origin: data,
                    result: compute_grid(
                        data.w, data.h,
                        data.x0, data.y0,
                        data.x1, data.y1,
                        colors
                    )
                }
                postMessage({ type: "render", data: result });
            }
        );
    });
    postMessage({ type: "ready" });
}

initWorker();
