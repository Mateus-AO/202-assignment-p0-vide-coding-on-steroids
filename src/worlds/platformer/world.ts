import { defineWorld } from '@/core/world'
import { lerp, smoothstep } from '@/utils/math'
import { beats } from './beats'
import { captions } from './captions'
import { CAMERA, CASTLE_X, DOOR_TOP, DOOR_Z } from './config'
import { heroX, heroY } from './hero'
import { Platformer } from './Platformer'
import { sound } from './sound'

/** Half the vertical field of view, as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/**
 * The camera trails slightly behind the hero and follows his jumps a little. On wide screens it
 * leads him by a few blocks so more of the level ahead shows; on narrow (phone) screens it
 * pulls back and keeps him left of center, so the next obstacle is in frame while he never
 * leaves it. The lead fades out as he walks up to the castle, so the door is centered before
 * the dolly. At the end the camera dollies into the door until the dark doorway fills the screen.
 */
export function platformerCamera(u: number, aspect: number) {
  const x = heroX(u)
  const lift = heroY(x) * CAMERA.liftFollow
  const wide = smoothstep(0.7, 1.4, aspect)
  const distance = Math.max(
    CAMERA.minDistance,
    CAMERA.minHalfWidth / (HALF_FOV_TAN * aspect),
  )
  const raise = CAMERA.phoneRaise * (1 - wide)
  const arrive = 1 - beats.smooth('approach', u)
  const cameraX = x + lerp(CAMERA.phoneLead, CAMERA.lead, wide) * arrive
  const dolly = beats.smooth('dolly', u)
  const doorMid = DOOR_TOP / 2
  return {
    position: [
      lerp(cameraX, CASTLE_X, dolly),
      lerp(CAMERA.height + raise + lift, doorMid, dolly),
      lerp(distance, DOOR_Z + CAMERA.doorStandoff, dolly),
    ] as [number, number, number],
    target: [
      lerp(cameraX + lerp(0, CAMERA.targetLead, wide) * arrive, CASTLE_X, dolly),
      lerp(CAMERA.targetHeight + raise + lift, doorMid, dolly),
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
  captions,
  theme: 'platformer',
})
