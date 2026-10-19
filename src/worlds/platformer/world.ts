import { defineWorld } from '@/core/world'
import { lerp, smoothstep } from '@/utils/math'
import { beats } from './beats'
import { CASTLE_X, DOOR_TOP, DOOR_Z } from './config'
import { heroX, heroY } from './hero'
import { Platformer } from './Platformer'
import { sound } from './sound'

/** Half the vertical field of view, as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/** The camera never gets closer than this; narrow screens pull it back. */
const MIN_DISTANCE = 16
/** On a narrow screen the view must be at least this many blocks wide on each side of the hero. */
const MIN_HALF_WIDTH = 5.5
/** The dolly ends this far in front of the door, close enough that the door fills the screen. */
const DOOR_STANDOFF = 0.56
const DOOR_MID = DOOR_TOP / 2

/**
 * The camera trails slightly behind the hero and follows his jumps a little. On wide screens it
 * leads him by a few blocks so more of the level ahead shows; on narrow (phone) screens it
 * centers on him and pulls back, so he never leaves the frame. At the end it dollies into the
 * castle door until the dark doorway fills the screen.
 */
export function platformerCamera(u: number, aspect: number) {
  const x = heroX(u)
  const lift = heroY(x) * 0.25
  const wide = smoothstep(0.7, 1.4, aspect)
  const distance = Math.max(MIN_DISTANCE, MIN_HALF_WIDTH / (HALF_FOV_TAN * aspect))
  const cameraX = x + lerp(0, 3, wide)
  const dolly = beats.smooth('dolly', u)
  return {
    position: [
      lerp(cameraX, CASTLE_X, dolly),
      lerp(3.6 + lift, DOOR_MID, dolly),
      lerp(distance, DOOR_Z + DOOR_STANDOFF, dolly),
    ] as [number, number, number],
    target: [
      lerp(cameraX + lerp(0, 2, wide), CASTLE_X, dolly),
      lerp(2.6 + lift, DOOR_MID, dolly),
      0,
    ] as [number, number, number],
  }
}

export const platformer = defineWorld({
  id: 'platformer',
  Scene: Platformer,
  cameraPath: platformerCamera,
  // The door is already black by now; the fade only hides the swap to the next world.
  exit: {
    kind: 'cover',
    style: 'black',
    whiteFrom: beats.ranges.dark[0],
    whiteFull: beats.ranges.dark[1],
    revealLength: 0.1,
  },
  sound,
  captions: [
    { from: 0.15, to: 0.45, text: 'A plumber, a flat world, a thousand remixes.' },
    {
      from: 0.45,
      to: 0.75,
      text: 'Every world you crossed can be taken apart like this.',
    },
  ],
})
