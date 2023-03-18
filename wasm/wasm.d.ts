declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
	/**
	* @param {number} width_
	* @param {number} height_
	* @param {number} x0
	* @param {number} y0
	* @param {number} x1
	* @param {number} y1
	* @param {Colors} colors
	* @returns {Uint8ClampedArray}
	*/
	export function compute_grid(width_: number, height_: number, x0: number, y0: number, x1: number, y1: number, colors: Colors): Uint8ClampedArray;
	/**
	*/
	export class Colors {
	  free(): void;
	/**
	* @param {Float64Array} c1
	* @param {Float64Array} c2
	* @param {Float64Array} c3
	* @param {Float64Array} c4
	* @param {Float64Array} c5
	* @param {Float64Array} c6
	* @returns {Colors}
	*/
	  static new(c1: Float64Array, c2: Float64Array, c3: Float64Array, c4: Float64Array, c5: Float64Array, c6: Float64Array): Colors;
	/**
	* @returns {Colors}
	*/
	  static default(): Colors;
	}
	
}

declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_colors_free: (a: number) => void;
  readonly colors_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
  readonly colors_default: () => number;
  readonly compute_grid: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
declare function wasm_bindgen (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
