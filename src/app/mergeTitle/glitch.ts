import { CAPTION_THEME_IDS } from '@/core/captionTheme'
import { SCRAMBLE_GLYPHS } from '@/core/reveal'

/**
 * The giant title's glitch cycle. This is the one place the page is driven by the clock
 * instead of scroll (a documented exception to "scenes are pure in `u`", limited to the title
 * overlay): every GLITCH_PERIOD_MS the text glitches for GLITCH_MS and then holds the next
 * world's look. Everything here is a pure function of the title's own clock `t` (ms of
 * visible time since the title appeared), so the sequence is the same on every visit.
 */

/** One glitch, then a different look, every 2 s. */
export const GLITCH_PERIOD_MS = 2000
/** How long one glitch lasts. */
export const GLITCH_MS = 220
/** The jitter pattern changes this often during a glitch (four patterns per glitch). */
export const GLITCH_STEP_MS = 55
/** The look the title shows when it first appears (and under reduced motion): the arena's. */
export const START_LOOK = CAPTION_THEME_IDS.length - 1

/**
 * Flash safety. Per cycle the title has one glitch envelope (a single rise and fall) and one
 * look change, so two pulses; none of them is a white full-screen strobe, and the look
 * change swaps between dark panels. The page's rule is at most 2.5 pulses per second.
 */
export const PULSES_PER_CYCLE = 2
export const MAX_FLASHES_PER_SECOND = 2.5
export const flashPulsesPerSecond = () => (PULSES_PER_CYCLE * 1000) / GLITCH_PERIOD_MS

/** What a glitch looks like at one moment. Filled in place by `glitchAt`. */
export type GlitchState = {
  /** True while a glitch is running. */
  active: boolean
  /** Strength in [0, 1]: rises and falls once over the glitch. */
  amount: number
  /** Which of the glitch's jitter patterns is showing (changes every GLITCH_STEP_MS). */
  step: number
  /** Cycle number (which glitch), so patterns differ between glitches. */
  cycle: number
  /** Horizontal shake in [-1, 1] (times the CSS shake size). */
  shake: number
  /** The colour-split direction, -1 or 1. */
  split: number
  /** True on the steps where a band of the text is torn sideways (the two colour layers). */
  tear: boolean
  /**
   * The torn band as rows clipped away above and below it, in [0, 1] of the text's height.
   * The second colour layer uses them swapped, so the two bands sit mirrored.
   */
  clipTop: number
  clipBottom: number
}

export const newGlitchState = (): GlitchState => ({
  active: false,
  amount: 0,
  step: 0,
  cycle: 0,
  shake: 0,
  split: 1,
  tear: false,
  clipTop: 0,
  clipBottom: 0,
})

/** A small integer hash: the same inputs always give the same number. */
export function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) ^ Math.imul(c + 1, 0x297a2d39)
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b)
  return (h ^ (h >>> 16)) >>> 0
}

const unit = (h: number) => (h % 10000) / 10000

/** Which glitch cycle `t` is in (cycle 0 is the quiet start). */
export const cycleAt = (t: number) => Math.max(0, Math.floor(t / GLITCH_PERIOD_MS))

/**
 * Index into CAPTION_THEME_IDS of the look showing at `t`: the arena's at first, then one
 * look further each cycle (pong, voxel, platformer, terminal, wall, arena, pong, ...). The
 * look changes halfway through the glitch, so the swap is hidden in the noise.
 */
export function lookIndexAt(t: number): number {
  const k = cycleAt(t)
  const phase = t - k * GLITCH_PERIOD_MS
  const shown = phase < GLITCH_MS / 2 ? k - 1 : k
  const n = CAPTION_THEME_IDS.length
  return (START_LOOK + Math.max(0, shown)) % n
}

/** The glitch at `t`, written into `out` (nothing is allocated). */
export function glitchAt(t: number, out: GlitchState): GlitchState {
  const k = cycleAt(t)
  const phase = t - k * GLITCH_PERIOD_MS
  if (k === 0 || phase >= GLITCH_MS || t < 0) {
    out.active = false
    out.amount = 0
    out.step = 0
    out.cycle = k
    out.shake = 0
    out.split = 1
    out.tear = false
    out.clipTop = 0
    out.clipBottom = 0
    return out
  }
  const step = Math.floor(phase / GLITCH_STEP_MS)
  const h = hash(k, step, 7)
  out.active = true
  out.cycle = k
  out.step = step
  // One smooth rise and fall; never fully zero while active, so the glitch always reads.
  out.amount = Math.max(0.2, Math.sin((Math.PI * phase) / GLITCH_MS))
  out.shake = unit(h) * 2 - 1
  out.split = (h >>> 8) % 2 === 0 ? 1 : -1
  const top = unit(hash(k, step, 11)) * 0.55
  const band = 0.12 + unit(hash(k, step, 13)) * 0.2
  // Alternate steps tear a band sideways; the main text itself is never clipped.
  const tear = step % 2 === 1
  out.tear = tear
  out.clipTop = tear ? top : 0
  out.clipBottom = tear ? Math.max(0, 1 - top - band) : 0
  return out
}

const isScrambled = (ch: string) => /[0-9A-Za-z]/.test(ch)

/**
 * `text` with some letters swapped for noise glyphs, as strong as `amount` (0 gives `text`).
 * Length, spaces and punctuation never change, so nothing reflows. Deterministic in
 * (cycle, step).
 */
export function corrupt(text: string, amount: number, cycle: number, step: number) {
  if (amount <= 0) return text
  const share = Math.min(1, amount) * 0.22
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const h = hash(cycle * 31 + step, i, 3)
    out +=
      isScrambled(ch) && unit(h) < share
        ? SCRAMBLE_GLYPHS[(h >>> 12) % SCRAMBLE_GLYPHS.length]
        : ch
  }
  return out
}
