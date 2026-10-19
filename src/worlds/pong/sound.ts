import { defineSound, type SoundCue } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { lerp } from '@/utils/math'
import { beats } from './beats'
import { HITS, type HitKind } from './rally'

/** Square-wave blips, one pitch per kind of contact. */
const BLIP: Record<HitKind, ToneSpec> = {
  paddleL: { wave: 'square', freq: 523, decay: 0.07, gain: 0.2 },
  paddleR: { wave: 'square', freq: 466, decay: 0.07, gain: 0.2 },
  wall: { wave: 'square', freq: 262, decay: 0.05, gain: 0.16 },
  block: { wave: 'square', freq: 174, to: 120, decay: 0.14, gain: 0.26 },
}

const CRACK: NoiseSpec = {
  filter: 'highpass',
  freq: 2600,
  q: 0.8,
  decay: 0.22,
  gain: 0.22,
}
const CRACK_SMALL: NoiseSpec = { ...CRACK, freq: 3400, decay: 0.12, gain: 0.14 }
const SHATTER_NOISE: NoiseSpec = {
  filter: 'bandpass',
  freq: 3200,
  to: 700,
  q: 0.9,
  decay: 0.7,
  gain: 0.32,
}
const SHATTER_FALL: ToneSpec = {
  wave: 'triangle',
  freq: 880,
  to: 180,
  decay: 0.55,
  gain: 0.12,
}
const TINKLES: ToneSpec[] = [1760, 2349, 1976].map((freq, i) => ({
  wave: 'sine',
  freq,
  delay: 0.06 + i * 0.07,
  decay: 0.18,
  gain: 0.06,
}))
/** The camera flies through the hole into the next world. */
const WHOOSH: NoiseSpec = {
  filter: 'bandpass',
  freq: 250,
  to: 1800,
  q: 1.2,
  attack: 0.35,
  decay: 0.9,
  gain: 0.16,
}

/** Every rally contact after the opening serve; paddle and wall hits follow the ball. */
const rallyCues: SoundCue[] = HITS.filter((h) => h.u > 0).map((h, i) => ({
  at: h.u,
  name: `hit:${h.kind}:${i}`,
  continuous: h.kind !== 'block',
  play: (v) => v.tone(BLIP[h.kind]),
}))

const [crackFrom, crackTo] = beats.ranges.crack

export const sound = defineSound({
  // A low cabinet hum with a faint tube hiss.
  bed: {
    layers: [
      { source: 'sine', freq: 60, gain: 0.05 },
      {
        source: 'square',
        freq: 120,
        filter: { type: 'lowpass', freq: 260 },
        gain: 0.02,
        wobble: { rate: 0.2, depth: 0.3 },
      },
      { source: 'noise', filter: { type: 'highpass', freq: 5000 }, gain: 0.01 },
    ],
  },
  cues: [
    ...rallyCues,
    { at: crackFrom, name: 'crack', play: (v) => v.noise(CRACK) },
    {
      at: lerp(crackFrom, crackTo, 0.5),
      name: 'crack:spread',
      play: (v) => v.noise(CRACK_SMALL),
    },
    {
      at: beats.ranges.shatter[0],
      name: 'shatter',
      play: (v) => {
        v.noise(SHATTER_NOISE)
        v.tone(SHATTER_FALL)
        for (const t of TINKLES) v.tone(t)
      },
    },
    { at: beats.ranges.blend[0], name: 'whoosh', play: (v) => v.noise(WHOOSH) },
  ],
})
