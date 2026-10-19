import { defineSound, type SoundCue } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { COIN_XS, FLAG_X, HERO_START, QUESTION_X, RUN_DISTANCE } from './config'
import { heroY, JUMPS, runPhase } from './hero'

/** Local progress at which the hero is at x (the inverse of `heroX`). */
export const uAtX = (x: number) => (x - HERO_START) / RUN_DISTANCE

/**
 * A foot lands every half run cycle (each time `runPhase` passes a multiple of pi), but only on
 * the ground. Distance-based, so steps stop when scrolling stops.
 */
export function footstepXs(resolution = 0.01) {
  const xs: number[] = []
  const end = HERO_START + RUN_DISTANCE
  let half = Math.floor(runPhase(HERO_START) / Math.PI)
  for (let x = HERO_START + resolution; x <= end; x += resolution) {
    const h = Math.floor(runPhase(x) / Math.PI)
    if (h !== half && heroY(x) === 0) xs.push(x)
    half = h
  }
  return xs
}

const STEP: NoiseSpec[] = [
  { filter: 'lowpass', freq: 900, q: 1.5, decay: 0.05, gain: 0.14 },
  { filter: 'lowpass', freq: 700, q: 1.5, decay: 0.05, gain: 0.12 },
]
const JUMP: ToneSpec = { wave: 'square', freq: 260, to: 640, decay: 0.16, gain: 0.1 }
const BUMP: ToneSpec = { wave: 'square', freq: 130, to: 80, decay: 0.09, gain: 0.2 }
const COIN: ToneSpec[] = [
  { wave: 'square', freq: 988, decay: 0.07, gain: 0.08 },
  { wave: 'square', freq: 1319, delay: 0.07, decay: 0.32, gain: 0.08 },
]
const FLAG_SLIDE: ToneSpec = {
  wave: 'triangle',
  freq: 880,
  to: 220,
  decay: 0.9,
  gain: 0.12,
}
/** An original rising arpeggio as the hero reaches the goal. */
const FANFARE: ToneSpec[] = [392, 523, 659, 784].map((freq, i) => ({
  wave: 'square',
  freq,
  delay: i * 0.12,
  decay: i === 3 ? 0.7 : 0.14,
  gain: 0.09,
}))

const stepCues: SoundCue[] = footstepXs().map((x, i) => ({
  at: uAtX(x),
  name: `step:${i}`,
  continuous: true,
  play: (v) => v.noise(STEP[i % 2]),
}))

const jumpCues: SoundCue[] = JUMPS.map(({ at, width }) => ({
  at: uAtX(at - width / 2),
  name: `jump:${at}`,
  play: (v) => v.tone(JUMP),
}))

const coinCues: SoundCue[] = COIN_XS.map((x) => ({
  at: uAtX(x - 0.3),
  name: `coin:${x}`,
  play: (v) => {
    for (const t of COIN) v.tone(t)
  },
}))

export const sound = defineSound({
  // A gentle major drone with a slow swell.
  bed: {
    layers: [
      {
        source: 'triangle',
        freq: 130.81,
        filter: { type: 'lowpass', freq: 900 },
        gain: 0.04,
        wobble: { rate: 0.25, depth: 0.3 },
      },
      { source: 'triangle', freq: 196, gain: 0.018, wobble: { rate: 0.17, depth: 0.4 } },
      { source: 'sine', freq: 659.25, gain: 0.006, wobble: { rate: 0.5, depth: 0.5 } },
    ],
  },
  cues: [
    ...stepCues,
    ...jumpCues,
    ...coinCues,
    {
      at: uAtX(QUESTION_X),
      name: 'block:bump',
      play: (v) => {
        v.tone(BUMP)
        for (const t of COIN) v.tone({ ...t, delay: (t.delay ?? 0) + 0.06 })
      },
    },
    { at: uAtX(FLAG_X - 2), name: 'flag', play: (v) => v.tone(FLAG_SLIDE) },
    {
      at: uAtX(FLAG_X),
      name: 'goal',
      play: (v) => {
        for (const t of FANFARE) v.tone(t)
      },
    },
  ],
})
