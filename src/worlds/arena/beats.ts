import { defineBeats } from '@/core/beats'

/**
 * The arena's story, in the world's progress. Other code (the giant title, the exit, sound)
 * reads these names; retime a beat here only.
 */
export const beats = defineBeats({
  /** The cover clears; each character walks in from its own edge. */
  arrive: [0, 0.28],
  /** The party forms and each character does its signature move. */
  party: [0.28, 0.55],
  /** They drift together into the green merge ring. */
  merge: [0.55, 0.78],
  /** "You can merge anything" locks in above the arena, the REA link under it. */
  title: [0.78, 1],
})
