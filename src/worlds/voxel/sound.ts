import { defineSound } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { beats } from './beats'

/** A low thrum as the creature stops and turns to the camera. */
const NOTICE: ToneSpec = {
  wave: 'sine',
  freq: 98,
  to: 82,
  attack: 0.08,
  decay: 0.7,
  gain: 0.14,
}
/** The fuse: a long rising hiss. */
const FUSE: NoiseSpec = {
  filter: 'highpass',
  freq: 2400,
  to: 5200,
  q: 0.7,
  attack: 0.25,
  decay: 1.5,
  gain: 0.24,
}
/** The blast: a crack, a rumble and a sub drop. Loud before the limiter; the ceiling holds. */
const BLAST_CRACK: NoiseSpec = {
  filter: 'bandpass',
  freq: 2200,
  q: 0.8,
  decay: 0.25,
  gain: 0.25,
}
const BLAST_RUMBLE: NoiseSpec = {
  filter: 'lowpass',
  freq: 1400,
  to: 120,
  q: 0.7,
  attack: 0.004,
  decay: 1.9,
  gain: 0.55,
}
const BLAST_SUB: ToneSpec = { wave: 'sine', freq: 90, to: 28, decay: 1.3, gain: 0.45 }

export const sound = defineSound({
  // Wind over the field and a soft open fifth.
  bed: {
    layers: [
      {
        source: 'noise',
        filter: { type: 'lowpass', freq: 420, q: 0.5 },
        gain: 0.07,
        wobble: { rate: 0.11, depth: 0.45 },
      },
      { source: 'sine', freq: 196, gain: 0.018, wobble: { rate: 0.07, depth: 0.4 } },
      { source: 'sine', freq: 293.66, gain: 0.012, wobble: { rate: 0.09, depth: 0.4 } },
    ],
  },
  cues: [
    { at: beats.ranges.notice[0], name: 'notice', play: (v) => v.tone(NOTICE) },
    { at: beats.ranges.hiss[0], name: 'fuse', play: (v) => v.noise(FUSE) },
    {
      at: beats.ranges.blast[0],
      name: 'blast',
      play: (v) => {
        v.noise(BLAST_CRACK)
        v.noise(BLAST_RUMBLE)
        v.tone(BLAST_SUB)
      },
    },
  ],
})
