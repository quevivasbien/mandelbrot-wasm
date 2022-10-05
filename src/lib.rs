use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use num::complex::Complex;

const LOG_MAX_DEPTH: f64 = 40.;
const MIN_MAX_ITER: u32 = 64;
const MAX_MAX_ITER: u32 = 4096;

#[wasm_bindgen]
pub struct Colors(Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>, Vec<f64>);

#[wasm_bindgen]
impl Colors {
    pub fn default() -> Colors {
        Colors(
            vec![0., 0., 0.],  // black
            vec![84., 147., 146.],  // teal
            vec![15., 15., 114.],  // blue
            vec![212., 135., 40.],  // orange
            vec![140., 10., 66.],  // burgundy
            vec![51., 3., 0.],  // dark red
        )
    }

    fn get_color(&self, x: f64, channel: usize) -> u8 {
        (   
            if x < 0. {
                let y = 1. - x;
                y * self.4[channel] + (1. - y) * self.5[channel]
            }
            else if x < 0.25 {
                let y = x * 4.;
                y * self.3[channel] + (1. - y) * self.4[channel]
            }
            else if x < 0.5 {
                let y = (x - 0.25) * 4.;
                y * self.2[channel] + (1. - y) * self.3[channel]
            }
            else if x < 0.75 {
                let y = (x - 0.5) * 4.;
                y * self.1[channel] + (1. - y) * self.2[channel]
            }
            else {
                let y = (x - 0.75) * 4.;
                y * self.0[channel] + (1. - y) * self.1[channel]
            }
        ) as u8
    }
}

fn mandel_iter(c: Complex<f64>, max_iter: u32) -> f64 {
    let mut z = c.clone();
    for i in 0..MIN_MAX_ITER {
        if z.norm() > 2. {
            return ((MAX_MAX_ITER - i) as f64) / (MAX_MAX_ITER as f64);
        }
        z = z * z + c;
    }
    // save absz for coloring interior points
    let absz = z.norm();
    for i in MIN_MAX_ITER..max_iter {
        if z.norm() > 2. {
            return ((MAX_MAX_ITER - i) as f64) / (MAX_MAX_ITER as f64);
        }
        z = z * z + c;
    }
    -((absz - 2.) / 2.).powi(4)
}

fn get_max_iter(x0: f64, y0: f64, x1: f64, y1: f64) -> u32 {
    let max_width = f64::max(x1 - x0, y1 - y0);
    let l = ((LOG_MAX_DEPTH + max_width.log2()) / LOG_MAX_DEPTH).clamp(0., 1.);
    ((MIN_MAX_ITER as f64) * l + (MAX_MAX_ITER as f64) * (1. - l)) as u32
}

#[wasm_bindgen]
pub fn compute_grid(width_: f64, height_: f64, x0: f64, y0: f64, x1: f64, y1: f64, colors: &Colors) -> Clamped<Vec<u8>> {
    let width = width_ as u32;
    let height = height_ as u32;
    let mut cells = vec![0; (width * height * 4) as usize];
    let xstep = (x1 - x0) / width as f64;
    let ystep = (y1 - y0) / height as f64;
    let max_iter = get_max_iter(x0, y0, x1, y1);
    for i in 0..width {
        for j in 0..height {
            let x = mandel_iter(
                Complex::new(
                    x0 + (i as f64) * xstep,
                    y0 + (j as f64) * ystep
                ),
                max_iter
            );
            cells[((i + j * width) * 4 + 0) as usize] = colors.get_color(x, 0);
            cells[((i + j * width) * 4 + 1) as usize] = colors.get_color(x, 1);
            cells[((i + j * width) * 4 + 2) as usize] = colors.get_color(x, 2);
            cells[((i + j * width) * 4 + 3) as usize] = 255;
        }
    }
    Clamped(cells)
}
