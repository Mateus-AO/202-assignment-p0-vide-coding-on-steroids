import { PIC_H, PIC_W } from './layout'

export { PIC_H, PIC_W }

/** Where the mascot's pupils look, each axis in [-1, 1] (x right, y up). */
export type Look = { x: number; y: number }

/**
 * CONTRACT (content agent implements; this is a stub). Palette indices to colors (rgb 0 to
 * 255). Index 0 is the background (black).
 */
export const PALETTE: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [217, 119, 87],
]

/**
 * CONTRACT (content agent implements; this is a stub). Draws the picture, a hand-drawn
 * pixel-art mascot, into `out` (PIC_W * PIC_H palette indices, row-major, y down). `look` moves
 * the pupils, `blink` is 0 (eyes open) to 1 (closed). Pure, allocation-free, never throws.
 * Compose it for the trapezoid pile (see SLOTS in layout.ts): keep what matters inside the
 * sets' slices and nothing important in the empty top corners.
 */
export function renderPicture(out: Uint8Array, look: Look, blink: number) {
  void look
  void blink
  out.fill(0, 0, PIC_W * PIC_H)
  const x0 = Math.floor(PIC_W * 0.3)
  const x1 = Math.floor(PIC_W * 0.7)
  const y0 = Math.floor(PIC_H * 0.3)
  const y1 = Math.floor(PIC_H * 0.8)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) out[y * PIC_W + x] = 1
}
