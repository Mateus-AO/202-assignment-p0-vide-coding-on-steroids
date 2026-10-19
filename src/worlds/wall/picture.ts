import { PIC_H, PIC_W } from './layout'

export { PIC_H, PIC_W }

/** Where the mascot's eyes look, each axis in [-1, 1] (x right, y up). */
export type Look = { x: number; y: number }

/** Palette indices to colors (rgb 0 to 255). Index 0 is the background (black). */
export const PALETTE: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [217, 119, 87], // 1 orange body
  [164, 80, 55], // 2 darker orange, for depth
  [34, 20, 18], // 3 eyes
  [240, 163, 128], // 4 highlight
  [62, 29, 21], // 5 faint glow under the feet
]

export const BG = 0
export const ORANGE = 1
export const SHADE = 2
export const EYE = 3
export const LIGHT = 4
export const GLOW = 5

/**
 * The picture is a hand-drawn pixel-art rendition of the Claude Code mascot, drawn here from
 * scratch in code. It is a one-time exception, approved by the owner, to the no-trademark
 * rule, and it does not imply endorsement.
 *
 * Composed for the pile's slices (see SLOTS in layout.ts): the body is as wide as the two top
 * sets, the arms sit in the outer sets of the middle row, the eyes in its center set and the
 * four feet in the bottom row's two center sets. The pile's gaps fall between body and feet.
 */
const BODY = { x0: 13, x1: 35, y0: 3, y1: 20 }
const ARMS = { left: 9, right: 35, w: 4, y0: 12, y1: 17 }
const LEGS = [13, 18, 26, 31] as const
const LEG = { w: 4, y0: 20, y1: 27 }
const EYES = { left: 21, right: 25, w: 2, y: 12, h: 3 }
/** The most the eyes move, in picture pixels; they stay inside the center set's slice. */
const REACH = { x: 2, y: 1 }

function box(out: Uint8Array, x0: number, y0: number, x1: number, y1: number, c: number) {
  const ya = Math.max(0, y0)
  const yb = Math.min(PIC_H, y1)
  const xa = Math.max(0, x0)
  const xb = Math.min(PIC_W, x1)
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) out[y * PIC_W + x] = c
}

/** Lids close from 3 rows (open) to 2, to a thin line. */
const eyeRows = (blink: number) => (blink >= 0.5 ? 1 : blink >= 0.2 ? 2 : 3)

const unit = (v: number) => (v >= -1 && v <= 1 ? v : v > 1 ? 1 : v < -1 ? -1 : 0)

/**
 * Draws the picture, a hand-drawn pixel-art mascot, into `out` (PIC_W * PIC_H palette indices,
 * row-major, y down). `look` moves the eyes, `blink` is 0 (eyes open) to 1 (closed). Pure,
 * allocation-free, and it never throws: out-of-range inputs are clamped.
 */
export function renderPicture(out: Uint8Array, look: Look, blink: number) {
  out.fill(BG, 0, PIC_W * PIC_H)

  // Shadow under the feet.
  box(out, 4, 27, 44, 28, GLOW)

  // Feet: four short legs, in two pairs, the right edge shaded.
  for (const x of LEGS) {
    box(out, x, LEG.y0, x + LEG.w, LEG.y1, ORANGE)
    box(out, x + LEG.w - 1, LEG.y0, x + LEG.w, LEG.y1, SHADE)
  }

  // Arms: little nubs at the sides.
  for (const x of [ARMS.left, ARMS.right]) {
    box(out, x, ARMS.y0, x + ARMS.w, ARMS.y1, ORANGE)
    box(out, x, ARMS.y1 - 1, x + ARMS.w, ARMS.y1, SHADE)
  }

  // Body: a chunky block with the top corners cut, light on top, dark below and on the right.
  const b = BODY
  box(out, b.x0, b.y0, b.x1, b.y1, ORANGE)
  box(out, b.x0, b.y0, b.x0 + 1, b.y0 + 1, BG)
  box(out, b.x1 - 1, b.y0, b.x1, b.y0 + 1, BG)
  box(out, b.x0 + 1, b.y0, b.x1 - 1, b.y0 + 1, LIGHT)
  box(out, b.x1 - 2, b.y0 + 1, b.x1, b.y1, SHADE)
  box(out, b.x0, b.y1 - 2, b.x1, b.y1, SHADE)

  // Eyes: dark squares that follow `look` and squash when `blink` closes them.
  const dx = Math.round(unit(look.x) * REACH.x)
  const dy = -Math.round(unit(look.y) * REACH.y)
  const rows = eyeRows(Math.max(0, unit(blink)))
  const y = EYES.y + dy + ((EYES.h - rows) >> 1)
  box(out, EYES.left + dx, y, EYES.left + dx + EYES.w, y + rows, EYE)
  box(out, EYES.right + dx, y, EYES.right + dx + EYES.w, y + rows, EYE)
}
