/** Character cells on one TV's screen. 28 x 12 cells of an 8 x 14 glyph is 4:3, like the glass. */
export const COLS_TV = 28
export const ROWS_TV = 12
/** Bytes per cell in a screen buffer: glyph code (ASCII 32 to 127, 0 = blank), then tone. */
export const CELL_BYTES = 4
export const TV_BYTES = COLS_TV * ROWS_TV * CELL_BYTES

/** How a cell is colored; the scene's shader turns these into shades of the set's phosphor. */
export const Tone = { DIM: 1, TEXT: 2, BRIGHT: 3, NOTE: 4, HOT: 5, CURSOR: 6 } as const

/**
 * CONTRACT (content agent implements; this is a stub). Writes TV `index`'s whole character grid
 * for wall progress `u` into `out` (TV_BYTES long): its own seeded decompile session (hex
 * turning into assembly, then pseudocode, scrolling like the terminal's). Pure (same input,
 * same bytes), allocation-free, never throws. It should look alive from `beats.warm` on and run
 * through `beats.decode`; the scene masks it with the warm-up and scrambles it while assembling.
 */
export function tvScreen(index: number, u: number, out: Uint8Array) {
  void index
  void u
  out.fill(0)
}

/** CONTRACT (content agent): the phosphor color of TV `index`, as rgb in 0 to 1. */
export function phosphorOf(index: number): readonly [number, number, number] {
  void index
  return [0.49, 0.96, 1.0]
}
