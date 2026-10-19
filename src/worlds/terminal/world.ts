import { defineWorld } from '@/core/world'
import { easeInOutCubic, lerp } from '@/utils/math'
import { HALF_FOV_TAN, SCREEN_H, SCREEN_W } from './layout'
import { Terminal } from './Terminal'

/** How much of the view the panel may fill at most, vertically and horizontally. */
const HEIGHT_FILL = 0.7
const WIDTH_FILL = 0.94
/** Looks a little below the panel's center, so the panel rides high and clears the caption box. */
const LOOK_Y = -SCREEN_H * 0.12
/** The camera starts this much farther back and drifts in over the scroll. */
const PUSH = 0.1

/**
 * Fixed in front of the panel; only the distance changes. It takes the aspect ratio: on a
 * phone the panel's width sets the distance, on a wide screen its height does.
 */
export function terminalCamera(u: number, aspect: number) {
  const fitHeight = SCREEN_H / 2 / (HEIGHT_FILL * HALF_FOV_TAN)
  const fitWidth = (SCREEN_W / 2 + 0.45) / (WIDTH_FILL * HALF_FOV_TAN * aspect)
  const distance = Math.max(fitHeight, fitWidth) * lerp(1 + PUSH, 1, easeInOutCubic(u))
  return {
    position: [0, LOOK_Y, distance] as [number, number, number],
    target: [0, LOOK_Y, 0] as [number, number, number],
  }
}

export const terminal = defineWorld({
  id: 'terminal',
  Scene: Terminal,
  cameraPath: terminalCamera,
  captions: [
    {
      from: 0.12,
      to: 0.34,
      text: 'Under every game is a pile of numbers someone chose.',
    },
    { from: 0.74, to: 1, text: 'Recover the numbers and you can rebuild the feel.' },
  ],
})
