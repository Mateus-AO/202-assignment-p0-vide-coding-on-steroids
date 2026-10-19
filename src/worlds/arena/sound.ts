import { defineSound, type SoundCue } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { lerp } from '@/utils/math'
import {
  ARRIVE,
  CAST,
  hopTakeoffs,
  patrolTurns,
  rallyContacts,
  type CastId,
} from './cast'
import { beats } from './beats'
import { glyphProgress } from './glyph'

/** Footsteps while a character walks in: this many, spread over its arrival window. */
export const STEPS_PER_ARRIVAL = 4

/** A footstep or a slide, one sound per kind of character. */
export const STEP: Record<CastId, { tone?: ToneSpec; noise?: NoiseSpec }> = {
  paddle: { tone: { wave: 'sine', freq: 330, to: 220, decay: 0.07, gain: 0.05 } },
  ball: { tone: { wave: 'square', freq: 880, decay: 0.03, gain: 0.025 } },
  hero: { noise: { filter: 'lowpass', freq: 900, q: 1.5, decay: 0.05, gain: 0.09 } },
  creature: { noise: { filter: 'lowpass', freq: 380, q: 1.2, decay: 0.07, gain: 0.09 } },
  walker: { noise: { filter: 'lowpass', freq: 600, q: 1.4, decay: 0.06, gain: 0.09 } },
}

/** Square blips like the arcade's: a higher one for the paddle, a lower one for the bumper. */
const BLIP = {
  paddle: { wave: 'square', freq: 523, decay: 0.07, gain: 0.07 },
  bumper: { wave: 'square', freq: 262, decay: 0.05, gain: 0.06 },
} as const satisfies Record<string, ToneSpec>

const HOP: ToneSpec = { wave: 'square', freq: 260, to: 640, decay: 0.16, gain: 0.07 }
const TURN: ToneSpec = { wave: 'sine', freq: 140, to: 70, decay: 0.2, gain: 0.09 }
const SNIFF: ToneSpec = { wave: 'triangle', freq: 330, to: 440, decay: 0.12, gain: 0.05 }

/** A pluck on a note of the chord, for each part of the symbol as it lights. */
const pluck = (freq: number, gain = 0.07): ToneSpec[] => [
  { wave: 'triangle', freq, decay: 0.5, gain },
  { wave: 'sine', freq: freq * 2, delay: 0.02, decay: 0.3, gain: gain * 0.4 },
]

/** The finished merge: a major chord strummed upward with a sparkle on top. */
export const CHORD: ToneSpec[] = [261.63, 329.63, 392, 523.25, 659.25, 1046.5].map(
  (freq, i) => ({
    wave: i < 3 ? 'triangle' : 'sine',
    freq,
    delay: i * 0.07,
    attack: 0.04,
    decay: i === 5 ? 1.2 : 1.8,
    gain: i < 3 ? 0.05 : 0.035,
  }),
)

/** Progress at which the symbol has been drawn `drawn` of the way (inverse of `glyphProgress`). */
export function uAtDrawn(drawn: number) {
  let lo: number = beats.ranges.merge[0]
  let hi: number = beats.ranges.merge[1]
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (glyphProgress(mid) < drawn) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const stepCues: SoundCue[] = CAST.flatMap((id) => {
  const [from, to] = ARRIVE[id]
  return Array.from({ length: STEPS_PER_ARRIVAL }, (_, i) => ({
    at: lerp(from, to, (i + 1) / (STEPS_PER_ARRIVAL + 1)),
    name: `step:${id}:${i}`,
    continuous: true,
    play: (v: Parameters<SoundCue['play']>[0]) => {
      const s = STEP[id]
      if (s.tone) v.tone(s.tone)
      if (s.noise) v.noise(s.noise)
    },
  }))
})

const rallyCues: SoundCue[] = rallyContacts()
  .filter((c) => c.u > beats.ranges.party[0])
  .map((c, i) => ({
    at: c.u,
    name: `rally:${c.kind}:${i}`,
    continuous: true,
    play: (v) => v.tone(BLIP[c.kind]),
  }))

const hopCues: SoundCue[] = hopTakeoffs().map((u, i) => ({
  at: u,
  name: `hop:${i}`,
  continuous: true,
  play: (v) => v.tone(HOP),
}))

const turnCues: SoundCue[] = patrolTurns().map((u, i) => ({
  at: u,
  name: `turn:${i}`,
  continuous: true,
  play: (v) => v.tone(TURN),
}))

const sniffCues: SoundCue[] = [0.36, 0.43, 0.5].map((at, i) => ({
  at,
  name: `sniff:${i}`,
  continuous: true,
  play: (v) => v.tone(SNIFF),
}))

/** The symbol lights part by part: the first node, the line, the arrowhead, the second node. */
const ringCues: SoundCue[] = [
  { drawn: 0.04, freq: 523.25, name: 'ring:node-a' },
  { drawn: 0.4, freq: 659.25, name: 'ring:line' },
  { drawn: 0.72, freq: 783.99, name: 'ring:arrow' },
  { drawn: 0.9, freq: 1046.5, name: 'ring:node-b' },
].map(({ drawn, freq, name }) => ({
  at: uAtDrawn(drawn),
  name,
  play: (v) => {
    for (const t of pluck(freq)) v.tone(t)
  },
}))

export const sound = defineSound({
  // A low, slow pad under a faint shimmer: a quiet room in an old role-playing game.
  bed: {
    layers: [
      {
        source: 'triangle',
        freq: 110,
        filter: { type: 'lowpass', freq: 420 },
        gain: 0.012,
        wobble: { rate: 0.13, depth: 0.3 },
      },
      { source: 'sine', freq: 164.81, gain: 0.006, wobble: { rate: 0.09, depth: 0.4 } },
      {
        source: 'noise',
        filter: { type: 'highpass', freq: 3000 },
        gain: 0.004,
        wobble: { rate: 0.2, depth: 0.3 },
      },
    ],
  },
  cues: [
    ...stepCues,
    ...rallyCues,
    ...hopCues,
    ...turnCues,
    ...sniffCues,
    ...ringCues,
    {
      at: beats.ranges.title[0],
      name: 'merged',
      play: (v) => {
        for (const t of CHORD) v.tone(t)
      },
    },
  ],
})
