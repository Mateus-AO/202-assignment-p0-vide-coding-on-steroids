import { COLS, ROWS } from './script'

/** Size of one character cell in world units, and so of the whole screen. */
export const CELL_W = 0.1
export const CELL_H = 0.175
export const SCREEN_W = COLS * CELL_W
export const SCREEN_H = ROWS * CELL_H

/** Half the vertical field of view, as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)
