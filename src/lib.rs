use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
// use web_sys::{console, Document, HtmlCanvasElement, CanvasRenderingContext2d, ImageData};
use num::complex::Complex;

#[wasm_bindgen]
pub fn compute_grid(width_: f64, height_: f64, x0: f64, y0: f64, x1: f64, y1: f64) -> Clamped<Vec<u8>> {
    let width = width_ as u32;
    let height = height_ as u32;
    let mut cells = vec![0; (width * height * 4) as usize];
    let xstep = (x1 - x0) / width as f64;
    let ystep = (y1 - y0) / height as f64;
    for i in 0..width {
        for j in 0..height {
            let c = Complex::new(
                x0 + (i as f64) * xstep,
                y0 + (j as f64) * ystep
            );
            let mut z = c.clone();
            let mut n = 0;
            while n < 255 && z.norm() < 2.0 {
                z = z * z + c;
                n += 1;
            }
            cells[((i + j * width) * 4 + 0) as usize] = 255 - n;
            cells[((i + j * width) * 4 + 1) as usize] = 255 - n;
            cells[((i + j * width) * 4 + 2) as usize] = 255 - n;
            cells[((i + j * width) * 4 + 3) as usize] = 255;
        }
    }
    Clamped(cells)
}
