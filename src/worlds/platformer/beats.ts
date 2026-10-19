import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** The hero runs the level, from the start to the goal flag. */
  run: [0, 0.75],
  /** He walks on to the castle, stepping toward the camera so he is in front of its wall. */
  approach: [0.75, 0.82],
  /** He stops and turns to face the door. */
  turn: [0.82, 0.85],
  /** He walks into the doorway and is swallowed by the dark. */
  enter: [0.85, 0.89],
  /** The camera pushes in until the dark door fills the screen, then holds there. */
  dolly: [0.87, 0.95],
  /** The black fade that hides the swap to the next world; the door is already black. */
  dark: [0.96, 1],
})
