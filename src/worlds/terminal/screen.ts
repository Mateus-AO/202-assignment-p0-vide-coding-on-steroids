import { clamp } from '@/utils/math'
import { COLS, LINES, ROWS, Tone, type Line } from './script'

/** Bytes per cell in the screen buffer: glyph code, then tone (the other two are unused). */
export const CELL_BYTES = 4
export const SCREEN_BYTES = COLS * ROWS * CELL_BYTES

/** The glyph for the cursor: a full block. Everything else is its ASCII code. */
export const BLOCK = 127

/** How long, in progress, a rewritten line takes to decode. */
export const SCRAMBLE_SPAN = 0.03
const SCRAMBLE = '0123456789ABCDEF#%&$@+*=/<>'

/** A stable pseudo-random number in [0, 1) for three integers. */
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function put(out: Uint8Array, row: number, col: number, code: number, tone: number) {
  if (col >= COLS) return
  const i = (row * COLS + col) * CELL_BYTES
  out[i] = code
  out[i + 1] = tone
}

const toneAt = (line: Line, col: number) =>
  line.valueFrom !== undefined && col >= line.valueFrom ? Tone.HOT : line.tone

/** Draws one line; returns the column where its cursor would sit. */
function drawLine(
  line: Line,
  row: number,
  lineIndex: number,
  u: number,
  out: Uint8Array,
) {
  const { text, to, swapAt } = line
  if (to !== undefined && swapAt !== undefined && u >= swapAt) {
    const t = (u - swapAt) / SCRAMBLE_SPAN
    const len = Math.max(text.length, to.length)
    const decoded = t >= 1 ? len : Math.floor(t * len)
    const frame = Math.floor(u * 400)
    for (let c = 0; c < len; c++) {
      let code = c < to.length ? to.charCodeAt(c) : 0
      if (c >= decoded && (c < text.length || c < to.length)) {
        code = SCRAMBLE.charCodeAt(
          Math.floor(hash(lineIndex, c, frame) * SCRAMBLE.length),
        )
      }
      if (code > 32) put(out, row, c, code, toneAt(line, c))
    }
    return to.length
  }
  const typed =
    line.span > 0
      ? Math.floor(clamp((u - line.start) / line.span, 0, 1) * text.length)
      : text.length
  for (let c = 0; c < typed; c++) {
    const code = text.charCodeAt(c)
    if (code > 32) put(out, row, c, code, toneAt(line, c))
  }
  return typed
}

/**
 * Writes the whole screen for progress `u` into `out` (SCREEN_BYTES long): the session so far,
 * scrolled up when it outgrows the screen, plus the cursor. Pure: same `u`, same bytes, and it
 * allocates nothing, so it can run every frame and scrubs both ways.
 */
export function renderScreen(u: number, out: Uint8Array) {
  out.fill(0)
  let last = -1
  while (last + 1 < LINES.length && LINES[last + 1].start <= u) last++
  if (last < 0) return

  const top = Math.max(0, last + 1 - ROWS)
  let cursorCol = 0
  for (let i = top; i <= last; i++) {
    const col = drawLine(LINES[i], i - top, i, u, out)
    if (i === last) cursorCol = col
  }
  put(out, last - top, cursorCol, BLOCK, Tone.CURSOR)
}
