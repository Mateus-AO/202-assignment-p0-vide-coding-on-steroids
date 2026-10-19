import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** Black: the terminal has just shut down. */
  hold: [0, 0.08],
  /** The TVs warm up from black, one after another from the center of the pile outward. */
  warm: [0.08, 0.25],
  /** Every screen runs its own decompile session. */
  decode: [0.25, 0.55],
  /** Text scrambles and locks into each set's slice of the picture, center outward. */
  assemble: [0.55, 0.8],
  /** The finished picture holds; the mascot's eyes follow the pointer and blink. */
  finish: [0.8, 1],
})
