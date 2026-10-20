import { defineWorld } from '@/core/world'
import { easeInOutCubic, lerp, smoothstep } from '@/utils/math'
import { sound } from './sound'
import { captions } from './captions'
import { Wall } from './Wall'

/** Half the vertical field of view as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/**
 * The pile's box in world units (y up, the glass plane at z = 0), with room for the
 * hand-stacked poses, the biggest set, and the pile's own turn toward the pointer.
 */
export const PILE_BOX = {
  halfWidth: 4.65,
  top: 4.55,
  bottom: -1.15,
  /** How far its nearest corner can come toward the camera, including the turn. */
  near: 1.15,
}
/** The pile fills at most this fraction of the view's width. */
const WIDTH_FILL = 0.94
/** On a wide screen the pile takes 80% of the height: 3% above it, 17% below for the caption. */
const HEIGHT_FILL = 0.8
const TOP_SHARE_WIDE = 0.03 / (1 - HEIGHT_FILL)
const TOP_SHARE_PHONE = 0.4
/** The camera starts this much farther back and drifts in over the scroll. */
const PUSH = 0.12

/**
 * Fixed in front of the pile; only the distance changes. It takes the aspect ratio: on a
 * phone the pile's width sets the distance, on a wide screen its height does. The pile rides
 * high so the caption box at the bottom clears it.
 */
export function wallCamera(u: number, aspect: number) {
  const span = PILE_BOX.top - PILE_BOX.bottom
  const halfByHeight = span / HEIGHT_FILL / 2
  const halfByWidth = PILE_BOX.halfWidth / (WIDTH_FILL * aspect)
  const half = Math.max(halfByHeight, halfByWidth)
  const slack = 2 * half - span
  const topShare = lerp(TOP_SHARE_PHONE, TOP_SHARE_WIDE, smoothstep(0.5, 1.5, aspect))
  const y = PILE_BOX.top + slack * topShare - half
  const distance =
    (half / HALF_FOV_TAN + PILE_BOX.near) * lerp(1 + PUSH, 1, easeInOutCubic(u))
  return {
    position: [0, y, distance] as [number, number, number],
    target: [0, y, 0] as [number, number, number],
  }
}

export const wall = defineWorld({
  id: 'wall',
  Scene: Wall,
  cameraPath: wallCamera,
  sound,
  captions,
  theme: 'wall',
})
