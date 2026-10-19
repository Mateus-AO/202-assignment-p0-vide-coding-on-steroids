import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** A rally: the ball bounces off the walls and both paddles, then strikes the block. */
  ball: [0, 0.45],
  /** The breaking texture creeps over the block. Starts when the ball strikes it. */
  crack: [0.45, 0.57],
  /** The block shatters and the portal opens. */
  shatter: [0.57, 0.76],
  /** The camera pushes toward the block. */
  approach: [0.52, 1],
  /** The next world takes over the screen. */
  blend: [0.68, 0.97],
})
