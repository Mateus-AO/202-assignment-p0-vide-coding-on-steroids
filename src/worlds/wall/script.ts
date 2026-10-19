import { clamp, lerp } from '@/utils/math'
import { mulberry32 } from '@/utils/math/random'
import { beats } from './beats'
import { SPECS } from './specs'

/** Character cells on one TV's screen. 28 x 12 cells of an 8 x 14 glyph is 4:3, like the glass. */
export const COLS_TV = 28
export const ROWS_TV = 12
/** Bytes per cell in a screen buffer: glyph code (ASCII 32 to 127, 0 = blank), then tone. */
export const CELL_BYTES = 4
export const TV_BYTES = COLS_TV * ROWS_TV * CELL_BYTES

/** How a cell is colored; the scene's shader turns these into shades of the set's phosphor. */
export const Tone = { DIM: 1, TEXT: 2, BRIGHT: 3, NOTE: 4, HOT: 5, CURSOR: 6 } as const
type ToneId = (typeof Tone)[keyof typeof Tone]

/** The glyph for the cursor: a full block. */
export const BLOCK = 127

/** How long, in progress, a rewritten line takes to decode. */
export const SWAP_SPAN = 0.022
const SCRAMBLE = '0123456789ABCDEF#%&$@+*=/<>'

/** One line of a session. Types out from `start` over `span`. */
export type SessionLine = {
  text: string
  tone: ToneId
  start: number
  span: number
  /** From this column on the line is drawn in the HOT tone (the value of an assignment). */
  hotFrom: number
  /** The line is rewritten into `to` (in `toTone`) at `swapAt`, through scrambled glyphs. */
  to: string
  toTone: ToneId
  swapAt: number
}

/** No rewrite: `swapAt` is never reached. */
const NEVER = Infinity

/** When the sessions come alive: around the middle of `warm`, staggered per set. */
const [WARM_FROM, WARM_TO] = beats.ranges.warm
const ALIVE_FROM = lerp(WARM_FROM, WARM_TO, 0.3)
const ALIVE_SPREAD = (WARM_TO - WARM_FROM) * 0.4
/** The main session (prompt, hex, assembly, pseudocode) ends around the end of `decode`. */
const BODY_END_MIN = lerp(beats.ranges.decode[0], beats.ranges.decode[1], 0.5)
const BODY_END_MAX = beats.ranges.decode[1] - 0.005
/** Follow-up lines trickle in across `assemble` and `finish`. */
const TAIL_FROM = beats.ranges.assemble[0] + 0.03
const TAIL_TO = beats.ranges.finish[1] - 0.09

const hex2 = (n: number) => (n & 0xff).toString(16).toUpperCase().padStart(2, '0')
const hex4 = (n: number) => (n & 0xffff).toString(16).padStart(4, '0')
const OPENING = [0x55, 0x89, 0x8b, 0x83, 0xd9, 0x33, 0xb8, 0xe8]

/** A draft line: times are in ticks, rescaled to progress once the whole session is laid out. */
type Draft = Omit<SessionLine, 'start' | 'span' | 'swapAt'> & {
  at: number
  ticks: number
  swapTick: number
}

function toneOfCode(text: string): ToneId {
  if (text.startsWith('void ')) return Tone.BRIGHT
  if (text.trimStart().startsWith(';')) return Tone.NOTE
  return Tone.TEXT
}

/** The column after `= ` (or `+= `, `-= `) where an assignment's value begins; 99 if none. */
function valueColumn(text: string) {
  const at = text.indexOf('= ')
  return at > 0 && text.endsWith(';') && !text.includes('==') ? at + 2 : 99
}

function build(index: number): SessionLine[] {
  const spec = SPECS[index]
  const rng = mulberry32(7000 + index * 131)
  const range = (a: number, b: number) => lerp(a, b, rng())
  const drafts: Draft[] = []
  let at = 0
  // Each set has its own tempo for each part of the session, and now and then it stalls.
  const tempo = { notes: range(0.5, 1.8), hex: range(0.4, 2), code: range(0.5, 1.8) }
  let part: keyof typeof tempo = 'notes'
  const add = (
    text: string,
    tone: ToneId,
    charTicks: number,
    pause: number,
    extra: Partial<Draft> = {},
  ) => {
    drafts.push({
      text,
      tone,
      hotFrom: 99,
      to: '',
      toTone: tone,
      swapTick: NEVER,
      at,
      ticks: text.length * charTicks,
      ...extra,
    })
    at +=
      text.length * charTicks + pause * tempo[part] + (rng() < 0.12 ? range(12, 50) : 0)
  }

  add('$ rea open ' + spec.bin, Tone.TEXT, 1.2, range(10, 24))
  for (const note of spec.notes) add(note, Tone.NOTE, 0.8, range(4, 9))
  add('', Tone.DIM, 0, range(1, 3))

  // The hex dump: made-up bytes, offsets that differ per set.
  part = 'hex'
  const base = 0x40 + index * 0x10
  const firstHex = drafts.length
  spec.asm.forEach((asm, i) => {
    const offset = hex4(base + i * 0x6 + Math.floor(rng() * 3))
    let bytes = ''
    for (let b = 0; b < 8; b++) {
      const value = b < 2 ? OPENING[Math.floor(rng() * OPENING.length)] : rng() * 256
      bytes += (b ? ' ' : '') + hex2(value)
    }
    add(offset + ' ' + bytes, Tone.DIM, 0.4, range(2, 6), {
      to: offset + ' ' + asm,
      toTone: Tone.TEXT,
    })
  })

  // Each hex line rewrites into assembly, one after another.
  at += range(4, 40)
  for (let i = 0; i < spec.asm.length; i++) {
    drafts[firstHex + i].swapTick = at
    at += range(14, 24)
  }
  at += range(6, 14)

  part = 'code'
  add('', Tone.DIM, 0, range(1, 3))
  add('; pseudocode', Tone.NOTE, 0.8, range(4, 8))
  for (const line of spec.code) {
    add(line, toneOfCode(line), 0.7, range(3, 11), { hotFrom: valueColumn(line) })
  }

  // Lay the main session out between its start and its end.
  const start = ALIVE_FROM + (((index * 4) % 9) / 8) * ALIVE_SPREAD + range(0, 0.004)
  const end = range(BODY_END_MIN, BODY_END_MAX)
  const scale = (end - start) / at

  const lines: SessionLine[] = drafts.map((d) => ({
    text: d.text,
    tone: d.tone,
    hotFrom: d.hotFrom,
    to: d.to,
    toTone: d.toTone,
    start: start + d.at * scale,
    span: d.ticks * scale,
    swapAt: d.swapTick === NEVER ? NEVER : start + d.swapTick * scale,
  }))

  // The tail: a few more commands and answers, spread over the rest of the page.
  const n = spec.tail.length
  const tailPhase = range(0, 0.4)
  const tailFrom = TAIL_FROM + range(0, 0.1)
  spec.tail.forEach((text, i) => {
    const tone = text.startsWith('$')
      ? Tone.TEXT
      : text.startsWith(';')
        ? Tone.NOTE
        : Tone.BRIGHT
    lines.push({
      text,
      tone,
      hotFrom: 99,
      to: '',
      toTone: tone,
      start: lerp(tailFrom, TAIL_TO, (i + tailPhase * (i ? 1 : 0)) / n),
      span: text.length * 0.0007,
      swapAt: NEVER,
    })
  })
  return lines
}

/** The nine sessions, built once at load. */
export const SESSIONS: readonly (readonly SessionLine[])[] = SPECS.map((_, i) => build(i))

const SCRAMBLE_CODES = Array.from(SCRAMBLE, (c) => c.charCodeAt(0))

/** A stable pseudo-random number in [0, 1) for four integers. */
function hash(a: number, b: number, c: number, d: number) {
  let h =
    Math.imul(a, 374761393) ^
    Math.imul(b, 668265263) ^
    Math.imul(c, 1274126177) ^
    Math.imul(d, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function put(out: Uint8Array, row: number, col: number, code: number, tone: number) {
  if (col >= COLS_TV || col < 0) return
  const i = (row * COLS_TV + col) * CELL_BYTES
  out[i] = code
  out[i + 1] = tone
}

/** Draws one line; returns the column where its cursor would sit. */
function drawLine(
  tv: number,
  line: SessionLine,
  row: number,
  lineIndex: number,
  u: number,
  out: Uint8Array,
) {
  const { text, to } = line
  if (u >= line.swapAt) {
    const t = (u - line.swapAt) / SWAP_SPAN
    const len = Math.max(text.length, to.length)
    const decoded = t >= 1 ? len : Math.floor(t * len)
    const frame = Math.floor(u * 400)
    for (let c = 0; c < len; c++) {
      let code = c < to.length ? to.charCodeAt(c) : 0
      let tone = line.toTone
      if (c >= decoded) {
        code =
          SCRAMBLE_CODES[
            Math.floor(hash(tv, lineIndex, c, frame) * SCRAMBLE_CODES.length)
          ]
        tone = line.tone
      }
      if (code > 32) put(out, row, c, code, tone)
    }
    return to.length
  }
  const typed =
    line.span > 0
      ? Math.floor(clamp((u - line.start) / line.span, 0, 1) * text.length)
      : text.length
  for (let c = 0; c < typed; c++) {
    const code = text.charCodeAt(c)
    if (code > 32) put(out, row, c, code, c >= line.hotFrom ? Tone.HOT : line.tone)
  }
  return typed
}

/**
 * Writes TV `index`'s whole character grid for wall progress `u` into `out` (TV_BYTES long):
 * its own decompile session, scrolled up when it outgrows the screen, plus the block cursor.
 * Hex bytes rewrite into assembly through scrambled glyphs, then pseudocode types out. Pure
 * (same input, same bytes), allocation-free, and it never throws: a bad `index` or `u` is
 * clamped. Blank before the sessions come alive, in the middle of `beats.warm`.
 */
export function tvScreen(index: number, u: number, out: Uint8Array) {
  out.fill(0, 0, TV_BYTES)
  const tv = index >= 0 ? Math.min(Math.floor(index), SESSIONS.length - 1) : 0
  const lines = SESSIONS[Number.isNaN(tv) ? 0 : tv]
  if (!(u >= 0)) return
  if (u > 1) u = 1
  let last = -1
  while (last + 1 < lines.length && lines[last + 1].start <= u) last++
  if (last < 0) return

  const top = Math.max(0, last + 1 - ROWS_TV)
  let cursorCol = 0
  for (let i = top; i <= last; i++) {
    const col = drawLine(tv, lines[i], i - top, i, u, out)
    if (i === last) cursorCol = col
  }
  put(out, last - top, cursorCol, BLOCK, Tone.CURSOR)
}

/** Nine distinct phosphors, all readable on black. Greens, ambers, cyans, a white, a blue. */
const PHOSPHORS: readonly (readonly [number, number, number])[] = [
  [0.45, 1.0, 0.55],
  [1.0, 0.72, 0.26],
  [0.4, 0.95, 1.0],
  [0.94, 0.97, 0.95],
  [0.56, 0.7, 1.0],
  [0.78, 1.0, 0.42],
  [0.36, 1.0, 0.82],
  [1.0, 0.88, 0.5],
  [0.7, 0.62, 1.0],
]

/** The phosphor color of TV `index`, as rgb in 0 to 1. An out-of-range index is clamped. */
export function phosphorOf(index: number): readonly [number, number, number] {
  const i = index >= 0 ? Math.min(Math.floor(index), PHOSPHORS.length - 1) : 0
  return PHOSPHORS[Number.isNaN(i) ? 0 : i]
}
