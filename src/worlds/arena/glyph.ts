import { smoothstep } from '@/utils/math'
import { beats } from './beats'

/**
 * The merge ring: a pull-request symbol laid on the floor out of half-tile cells. Two nodes
 * (rings) joined by a line that runs up from the left node, across the top and down into the
 * right node, ending in an arrowhead that points at it. The middle is left open: the cast
 * settles inside it.
 */

/** Grid size, in cells; one cell is half a floor tile. */
export const GRID = { cols: 17, rows: 12, pitch: 0.5, tile: 0.44 }
/** Where the grid's middle (col 8, row 6) lies on the floor. */
export const GLYPH_CENTER = { x: 0, z: -0.3 }

export type GlyphCell = {
  col: number
  row: number
  /** Floor position of the cell's center. */
  x: number
  z: number
  /** When the cell lights up, in [0, 1]: the symbol is drawn along its line, node to node. */
  key: number
}

/** Floor position of a grid cell's center. */
export const cellX = (col: number) => GLYPH_CENTER.x + (col - 8) * GRID.pitch
export const cellZ = (row: number) => GLYPH_CENTER.z + (row - 6) * GRID.pitch

type Pt = [col: number, row: number]

/** Cells of a ring around (cx, cy), clockwise from the top. */
function ring(cx: number, cy: number): Pt[] {
  const found: { pt: Pt; angle: number }[] = []
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const d = Math.hypot(c - cx, r - cy)
      if (d >= 1.5 && d <= 2.45) {
        const angle = (Math.atan2(c - cx, cy - r) + Math.PI * 2) % (Math.PI * 2)
        found.push({ pt: [c, r], angle })
      }
    }
  }
  return found.sort((a, b) => a.angle - b.angle).map((f) => f.pt)
}

const run = (from: Pt, to: Pt): Pt[] => {
  const n = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
  return Array.from({ length: n + 1 }, (_, i) => [
    from[0] + Math.round(((to[0] - from[0]) * i) / n),
    from[1] + Math.round(((to[1] - from[1]) * i) / n),
  ])
}

/** Node centers and the line's corners, in cells. */
const NODE_A: Pt = [2, 9]
const NODE_B: Pt = [14, 9]
const TOP_ROW = 1

/** The symbol's parts in drawing order, each with the slice of [0, 1] it occupies. */
const PARTS: { cells: Pt[]; from: number; to: number }[] = [
  { cells: ring(...NODE_A), from: 0, to: 0.22 },
  { cells: run([NODE_A[0], 6], [NODE_A[0], TOP_ROW]), from: 0.22, to: 0.4 },
  { cells: run([NODE_A[0] + 1, TOP_ROW], [NODE_B[0] - 1, TOP_ROW]), from: 0.4, to: 0.7 },
  {
    cells: [
      ...run([NODE_B[0], TOP_ROW], [NODE_B[0], 3]),
      // Arrowhead, pointing down into the right node.
      ...run([NODE_B[0] - 2, 4], [NODE_B[0] + 2, 4]),
      ...run([NODE_B[0] - 1, 5], [NODE_B[0] + 1, 5]),
      [NODE_B[0], 6] as Pt,
    ],
    from: 0.7,
    to: 0.82,
  },
  { cells: ring(...NODE_B), from: 0.82, to: 1 },
]

function build(): GlyphCell[] {
  const seen = new Set<string>()
  const out: GlyphCell[] = []
  for (const part of PARTS) {
    part.cells.forEach(([col, row], i) => {
      const id = `${col},${row}`
      if (seen.has(id)) return
      seen.add(id)
      const t = part.cells.length > 1 ? i / (part.cells.length - 1) : 0
      out.push({
        col,
        row,
        x: cellX(col),
        z: cellZ(row),
        key: part.from + (part.to - part.from) * t,
      })
    })
  }
  return out
}

export const GLYPH_CELLS: readonly GlyphCell[] = build()

/** How far the symbol has been drawn at world progress `u`, in [0, 1]. */
export function glyphProgress(u: number) {
  return smoothstep(0.06, 0.8, beats.linear('merge', u))
}

/** A cell's size in [0, 1] when the symbol is `drawn` complete: it pops in along the line. */
export function cellScale(key: number, drawn: number) {
  return smoothstep(key * 0.8, key * 0.8 + 0.2, drawn)
}

/** The open middle of the symbol, where the cast settles (floor x/z of its center). */
export const GLYPH_INSIDE = { x: GLYPH_CENTER.x, z: GLYPH_CENTER.z + 0.2 }
