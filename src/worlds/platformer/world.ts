import { defineWorld } from '@/core/world'
import { lerp, smoothstep } from '@/utils/math'
import { heroX, heroY } from './hero'
import { Platformer } from './Platformer'

/** Half the vertical field of view, as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/** The camera never gets closer than this; narrow screens pull it back. */
const MIN_DISTANCE = 16
/** On a narrow screen the view must be at least this many blocks wide on each side of the hero. */
const MIN_HALF_WIDTH = 5.5

/**
 * The camera trails slightly behind the hero and follows his jumps a little. On wide screens it
 * leads him by a few blocks so more of the level ahead shows; on narrow (phone) screens it
 * centers on him and pulls back, so he never leaves the frame.
 */
export function platformerCamera(u: number, aspect: number) {
  const x = heroX(u)
  const lift = heroY(x) * 0.25
  const wide = smoothstep(0.7, 1.4, aspect)
  const distance = Math.max(MIN_DISTANCE, MIN_HALF_WIDTH / (HALF_FOV_TAN * aspect))
  const cameraX = x + lerp(0, 3, wide)
  return {
    position: [cameraX, 3.6 + lift, distance] as [number, number, number],
    target: [cameraX + lerp(0, 2, wide), 2.6 + lift, 0] as [number, number, number],
  }
}

export const platformer = defineWorld({
  id: 'platformer',
  Scene: Platformer,
  cameraPath: platformerCamera,
  captions: [
    { from: 0.2, to: 0.6, text: 'A plumber, a flat world, a thousand remixes.' },
    { from: 0.6, to: 1, text: 'Every world you crossed can be taken apart like this.' },
  ],
})
