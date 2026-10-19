import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** The camera tilts down from level into the field. */
  tilt: [0, 0.3],
  /** The camera gets close; the creature stops wandering and slowly turns to face it. */
  notice: [0.6, 0.76],
  /** The camera locks on to the creature. */
  lock: [0.35, 0.7],
  /** The camera slows to a stop as the creature reaches it. */
  slow: [0.65, 0.9],
  /** The creature, facing the camera, ignites: it swells and flashes. */
  hiss: [0.76, 0.86],
  /** The creature explodes and white covers the screen. */
  blast: [0.86, 0.97],
})
