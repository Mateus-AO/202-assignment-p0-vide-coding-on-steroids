import { defineSound } from '@/core/sound'

/** Placeholder: the sound agent replaces this with the typing ticks and the shutdown cue. */
export const sound = defineSound({
  bed: { layers: [{ source: 'sine', freq: 55, gain: 0.004 }] },
  cues: [],
})
