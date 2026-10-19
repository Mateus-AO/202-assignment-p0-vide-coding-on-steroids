import { clamp } from '@/utils/math'
import type { Caption } from './caption'

/**
 * The caption reveal: a terminal-style scramble that resolves into the text as the world's
 * progress moves through the caption's range. Everything here is a pure function of progress,
 * so scrubbing backwards un-writes the text. `components/Caption` applies it to the DOM.
 */

/** Glyphs the scramble draws from. Plain ASCII so every one is as wide as the final letters. */
export const SCRAMBLE_GLYPHS = '0123456789ABCDEF#%&$@+*=/<>'
/** How many characters are in flux between the resolved text and the not-yet-written rest. */
export const NOISE_WIDTH = 4
/** The scramble changes glyphs this many times over a field's reveal. */
export const NOISE_TICKS = 48
/** The reveal never takes more than this share of a caption's range; the rest is reading time. */
export const MAX_REVEAL_SHARE = 0.6
/** Progress (of a world) one character of text takes to write, when the range is long enough. */
export const PROGRESS_PER_CHAR = 0.002
/** What the stats row counts for in the reveal order, in characters. */
export const STATS_WEIGHT = 16

export type FieldKey = 'kicker' | 'headline' | 'body' | 'stats' | 'footnote'
export type Field = { key: FieldKey; weight: number }

/** The fields a caption has, in the order they are written, with their share of the reveal. */
export function captionFields(c: Caption): Field[] {
  const out: Field[] = []
  if (c.kicker) out.push({ key: 'kicker', weight: c.kicker.length })
  if (c.headline) out.push({ key: 'headline', weight: c.headline.length })
  if (c.body) out.push({ key: 'body', weight: c.body.length })
  if (c.stats?.length) out.push({ key: 'stats', weight: STATS_WEIGHT })
  if (c.footnote) out.push({ key: 'footnote', weight: c.footnote.length })
  return out
}

/** How much text a caption has, for deciding how long it takes to write. */
export const captionChars = (c: Caption) =>
  captionFields(c).reduce((sum, f) => sum + f.weight, 0)

/**
 * How far written the caption is at the world's progress `u`, in [0, 1]. A long range gives
 * a long text the time it needs; a short text is written quickly and then simply stays. A
 * `settled` caption is complete from its start.
 */
export function revealProgress(c: Caption, u: number): number {
  if (c.settled) return 1
  const span = Math.min(
    (c.to - c.from) * MAX_REVEAL_SHARE,
    captionChars(c) * PROGRESS_PER_CHAR,
  )
  return clamp((u - c.from) / span, 0, 1)
}

/**
 * Splits the whole caption's reveal `p` over its fields, in order, by weight. Fills `out` (one
 * slot per field): 1 for a finished field, a fraction for the one being written, and -1 for
 * fields that have not been reached yet.
 */
export function fieldProgresses(
  fields: readonly Field[],
  p: number,
  out: Float64Array | number[],
): void {
  let total = 0
  for (const f of fields) total += f.weight
  let start = 0
  for (let i = 0; i < fields.length; i++) {
    const end = start + fields[i].weight / total
    if (p >= end) out[i] = 1
    else if (p > start || i === 0) out[i] = Math.max(0, (p - start) / (end - start))
    else out[i] = -1
    start = end
  }
}

/** A small integer hash; the same inputs always give the same glyph. */
function hash(seed: number, index: number, tick: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(index + 1, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) ^ Math.imul(tick + 1, 0x297a2d39)
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b)
  return (h ^ (h >>> 16)) >>> 0
}

const isScrambled = (ch: string) => /[0-9A-Za-z]/.test(ch)

/** The text at some moment of its reveal, in the four pieces the DOM shows. */
export type Revealed = {
  /** Already written, shown as is. */
  done: string
  /** Being written: letters and digits show as noise, everything else as is. */
  noise: string
  /** The one character under the cursor ('' when finished or not started). */
  cursor: string
  /** Not yet written. Shown invisibly so the box keeps its final size. */
  rest: string
}

/**
 * `text` at reveal `progress` in [0, 1] (negative: not started, nothing shown, no cursor).
 * The writing head runs left to right; NOISE_WIDTH characters behind it are scrambled, the
 * ones before those are final. Spaces, punctuation and the length never change, so lines wrap
 * exactly as in the final text.
 */
export function scramble(text: string, progress: number, seed: number): Revealed {
  const n = text.length
  if (progress < 0) return { done: '', noise: '', cursor: '', rest: text }
  if (progress >= 1) return { done: text, noise: '', cursor: '', rest: '' }
  const head = Math.floor(progress * (n + NOISE_WIDTH))
  const written = clamp(head, 0, n)
  const resolved = clamp(head - NOISE_WIDTH, 0, n)
  const tick = Math.floor(progress * NOISE_TICKS)
  let noise = ''
  for (let i = resolved; i < written; i++) {
    const ch = text[i]
    noise += isScrambled(ch)
      ? SCRAMBLE_GLYPHS[hash(seed, i, tick) % SCRAMBLE_GLYPHS.length]
      : ch
  }
  return {
    done: text.slice(0, resolved),
    noise,
    cursor: written < n ? text[written] : '',
    rest: text.slice(written + 1),
  }
}

/** Just the visible part of `scramble`, for text that sits in a fixed-size slot (stats). */
export function scrambled(text: string, progress: number, seed: number): string {
  const r = scramble(text, progress, seed)
  return r.done + r.noise
}

const NUMBER = /^(\d[\d,]*)(?:\.(\d+))?([\s\S]*)$/

/**
 * A stat value at `progress`: a leading number counts up from 0 (keeping its decimals, and
 * the text after it), anything else scrambles in. Ends exactly at `value`.
 */
export function statValue(value: string, progress: number, seed: number): string {
  if (progress >= 1) return value
  if (progress <= 0) return ''
  const m = NUMBER.exec(value)
  if (!m) return scrambled(value, progress, seed)
  const decimals = m[2]?.length ?? 0
  const target = Number(m[1].replace(/,/g, '') + (decimals ? `.${m[2]}` : ''))
  const eased = 1 - (1 - progress) * (1 - progress)
  const counted = target * eased
  return (decimals ? counted.toFixed(decimals) : String(Math.floor(counted))) + m[3]
}

/** Progress of stat `i` of `count` inside the stats field: they start one after another. */
export function statProgress(p: number, i: number, count: number): number {
  const stagger = 0.5
  const start = count > 1 ? (i / (count - 1)) * stagger : 0
  return clamp((p - start) / (1 - stagger), 0, 1)
}
