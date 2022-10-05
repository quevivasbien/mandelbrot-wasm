use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
// use web_sys::{console, Document, HtmlCanvasElement, CanvasRenderingContext2d, ImageData};
use num::complex::Complex;

const MAX_ITER: u32 = 256;
// const BREAK_LIM: f64 = 1e-5;

#[wasm_bindgen]
pub struct Colors(Clamped<Vec<u8>>, Clamped<Vec<u8>>, Clamped<Vec<u8>>, Clamped<Vec<u8>>, Clamped<Vec<u8>>);

#[wasm_bindgen]
impl Colors {
    pub fn default() -> Colors {
        Colors(
            Clamped(vec![0, 0, 0,]),  // black
            Clamped(vec![84, 147, 146]),  // teal
            Clamped(vec![15, 15, 114]),  // blue
            Clamped(vec![212, 135, 40]),  // orange
            Clamped(vec![140, 10, 66]),  // burgundy
        )
    }

    fn get_color(&self, x: f64, channel: usize) -> u8 {
        (
            if x < 0. {
                let y = -x;
                y * (self.4[channel] as f64) + (1. - y) * (self.3[channel] as f64)
            }
            else if x < 0.25 {
                let y = x * 4.;
                y * (self.2[channel] as f64) + (1. - y) * (self.3[channel] as f64)
            }
            else if x < 0.5 {
                let y = (x - 0.25) * 4.;
                y * (self.1[channel] as f64) + (1. - y) * (self.2[channel] as f64)
            }
            else {
                let y = x * 2. - 1.;
                y * (self.0[channel] as f64) + (1. - y) * (self.1[channel] as f64)
            }
        ) as u8
    }
}

fn mandel_iter(c: Complex<f64>) -> f64 {
    let mut z = c.clone();
    let mut i = MAX_ITER;
    let mut absz = 0.;
    while i > 0 {
        absz = z.norm();
        if absz > 2. {
            break;
        }
        z = z * z + c;
        // if absz < BREAK_LIM {
        //     i = 0;
        //     break;
        // }
        i -= 1;
    }
    if i == 0 {
        -((absz - 2.) / 2.).powi(4)
    }
    else {
        (i as f64) / (MAX_ITER as f64)
    }
}

#[wasm_bindgen]
pub fn compute_grid(width_: f64, height_: f64, x0: f64, y0: f64, x1: f64, y1: f64, colors: &Colors) -> Clamped<Vec<u8>> {
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
            let x = mandel_iter(c);
            cells[((i + j * width) * 4 + 0) as usize] = colors.get_color(x, 0);
            cells[((i + j * width) * 4 + 1) as usize] = colors.get_color(x, 1);
            cells[((i + j * width) * 4 + 2) as usize] = colors.get_color(x, 2);
            cells[((i + j * width) * 4 + 3) as usize] = 255;
        }
    }
    Clamped(cells)
}
