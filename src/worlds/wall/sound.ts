import { defineSound } from '@/core/sound'

/** Placeholder: the sound agent replaces this with the warm-up, static and assembly sounds. */
export const sound = defineSound({
  bed: {
    layers: [{ source: 'noise', filter: { type: 'lowpass', freq: 600 }, gain: 0.004 }],
  },
  cues: [],
})
