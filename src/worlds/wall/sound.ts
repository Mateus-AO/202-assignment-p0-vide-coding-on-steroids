import { defineSound, type SoundCue } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { lerp } from '@/utils/math'
import { beats } from './beats'
import { TV_COUNT, WAVE_RANK } from './layout'

/**
 * Where set `index`'s part of a wave starts in `range`: the same stagger as `warmAmount` and
 * `assembleAmount` in layout.ts (a window of half the beat, slid by the set's rank), which the
 * tests check against those functions.
 */
export function waveStart(range: readonly [number, number], index: number) {
  const [from, to] = range
  const len = (to - from) * 0.5
  return lerp(from, to - len, WAVE_RANK[index])
}

/**
 * Sets of equal distance from the center (the pile is symmetric) start at the same instant, and
 * a fling plays at most three cues a frame. So each set after the first of its rank lags by
 * this much progress, a hair of scroll, which also ripples them instead of stacking them.
 */
export const TIE_LAG = 0.004

/** How many sets of lower index share this set's rank. */
const tieOrder = (index: number) =>
  WAVE_RANK.slice(0, index).filter((r) => Math.abs(r - WAVE_RANK[index]) < 1e-9).length

/** Progress at which set `index` starts its part of a wave in `range`, with its tie lag. */
export const cueTime = (range: readonly [number, number], index: number) =>
  waveStart(range, index) + tieOrder(index) * TIE_LAG

/** Notes of a pentatonic ladder (C5 up), so the lock clicks climb outward from the center. */
const LADDER = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
const rungOf = (index: number) =>
  LADDER[Math.round(WAVE_RANK[index] * (LADDER.length - 1))]

/**
 * A set starts warming: a soft thunk of the tube coming on and a short rising CRT whine, which
 * sits a little higher the farther the set is from the center.
 */
export function warmVoices(index: number): {
  thunk: ToneSpec
  thump: NoiseSpec
  whine: ToneSpec
} {
  const r = WAVE_RANK[index]
  const whine = 1500 + r * 800
  return {
    thunk: { wave: 'sine', freq: 150 - r * 25, to: 62, decay: 0.16, gain: 0.08 },
    thump: { filter: 'lowpass', freq: 520, to: 220, q: 0.8, decay: 0.07, gain: 0.07 },
    whine: {
      wave: 'sine',
      freq: whine,
      to: whine * 2.1,
      attack: 0.03,
      decay: 0.3,
      gain: 0.02,
      delay: 0.04,
    },
  }
}

/** A set's text starts turning to noise: a short fast warble of two chirps and a fizz. */
export function scrambleVoices(index: number): { chirps: ToneSpec[]; fizz: NoiseSpec } {
  const base = 800 + WAVE_RANK[index] * 500
  return {
    chirps: [
      { wave: 'square', freq: base, to: base * 2.1, decay: 0.05, gain: 0.018 },
      {
        wave: 'square',
        freq: base * 1.4,
        to: base * 2.8,
        delay: 0.04,
        decay: 0.05,
        gain: 0.014,
      },
    ],
    fizz: { filter: 'bandpass', freq: 2600, to: 5000, q: 1.2, decay: 0.08, gain: 0.02 },
  }
}

/** A set's noise snaps into the picture: a soft click with a short note on the ladder. */
export function lockVoices(index: number): { click: NoiseSpec; note: ToneSpec } {
  return {
    click: { filter: 'bandpass', freq: 3200, q: 1.6, decay: 0.025, gain: 0.05 },
    note: { wave: 'triangle', freq: rungOf(index), decay: 0.12, gain: 0.03 },
  }
}

/** The finished picture: a warm, soft major chord (A, E, A, C#, E), strummed slowly. */
const CHORD: ToneSpec[] = [220, 329.63, 440, 554.37, 659.25].map((freq, i) => ({
  wave: i < 2 ? 'triangle' : 'sine',
  freq,
  delay: i * 0.06,
  attack: 0.08,
  decay: 1.8,
  gain: i < 2 ? 0.04 : 0.028,
}))

const setIndices = Array.from({ length: TV_COUNT }, (_, i) => i)

const warmCues: SoundCue[] = setIndices.map((i) => ({
  at: cueTime(beats.ranges.warm, i),
  name: `warm:${i}`,
  play: (v) => {
    const { thunk, thump, whine } = warmVoices(i)
    v.tone(thunk)
    v.noise(thump)
    v.tone(whine)
  },
}))

const scrambleCues: SoundCue[] = setIndices.map((i) => ({
  at: cueTime(beats.ranges.assemble, i),
  name: `scramble:${i}`,
  play: (v) => {
    const { chirps, fizz } = scrambleVoices(i)
    for (const t of chirps) v.tone(t)
    v.noise(fizz)
  },
}))

/** `lock` runs 0 to 1 over the second half of a set's window, so it starts at its middle. */
const lockCues: SoundCue[] = setIndices.map((i) => {
  const [from, to] = beats.ranges.assemble
  return {
    at: cueTime(beats.ranges.assemble, i) + (to - from) * 0.5 * 0.5,
    name: `lock:${i}`,
    play: (v) => {
      const { click, note } = lockVoices(i)
      v.noise(click)
      v.tone(note)
    },
  }
})

export const sound = defineSound({
  // Soft static hiss over a faint low hum.
  bed: {
    layers: [
      {
        source: 'noise',
        filter: { type: 'highpass', freq: 1800 },
        gain: 0.01,
        wobble: { rate: 0.2, depth: 0.2 },
      },
      { source: 'sine', freq: 60, gain: 0.009, wobble: { rate: 0.11, depth: 0.3 } },
      {
        source: 'triangle',
        freq: 120,
        filter: { type: 'lowpass', freq: 300 },
        gain: 0.004,
      },
    ],
  },
  cues: [
    ...warmCues,
    ...scrambleCues,
    ...lockCues,
    {
      at: beats.ranges.assemble[1],
      name: 'complete',
      play: (v) => {
        for (const t of CHORD) v.tone(t)
      },
    },
  ],
})
