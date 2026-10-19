import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** The black lifts and the panel fades up out of it. */
  rise: [0, 0.1],
  /** A prompt, a hex dump of raw bytes. */
  boot: [0.07, 0.35],
  /** The bytes turn into assembly, and the comments explain decomps and REA. */
  decode: [0.35, 0.7],
  /** The mechanics come out as a named table. */
  recover: [0.7, 1],
})
