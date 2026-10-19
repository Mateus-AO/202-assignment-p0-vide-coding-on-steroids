import type { CameraPose } from '@/core/world'
import { easeInOutCubic, lerp, smoothstep } from '@/utils/math'
import type { Vec3 } from '@/utils/math/types'
import { beats } from './beats'

/** Half of the page camera's vertical field of view (50 degrees), as a tangent. */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/** The glass, in world units, in the plane z = 0. The portal fills exactly this. */
export const GLASS_W = 4
export const GLASS_H = 3
/** The casing's front plate hides the glass's edges: this window is what you see of it. */
export const HOLE_W = 3.7
export const HOLE_H = 2.75
export const HOLE_RADIUS = 0.16
/** The plate stands this far in front of the glass; the glass is a hair behind the portal plane. */
export const PLATE_Z = 0.3
export const GLASS_Z = -0.01

/** How much of the view the window fills at the start, vertically and horizontally. */
const HEIGHT_FILL = 0.74
const WIDTH_FILL = 0.94

/** Where the window's center sits in the view at the start (0 top, 1 bottom). */
export const windowCenter = (aspect: number) =>
  lerp(0.4, 0.46, smoothstep(0.5, 1.3, aspect))

/**
 * Distance from the glass at the start. It takes the aspect ratio: on a phone the window's
 * width sets it, on a wide screen its height does.
 */
export function startDistance(aspect: number) {
  const fitHeight = HOLE_H / 2 / (HEIGHT_FILL * HALF_FOV_TAN)
  const fitWidth = HOLE_W / 2 / (WIDTH_FILL * HALF_FOV_TAN * aspect)
  return PLATE_Z + Math.max(fitHeight, fitWidth)
}

/** Half the view's height at the plate's depth when the camera is at the start. */
const startHalfHeight = (aspect: number) =>
  (startDistance(aspect) - PLATE_Z) * HALF_FOV_TAN

/**
 * Straight ahead, always looking down -z (the direction Pong starts in), flying from the
 * loading screen into the glass. The camera ends exactly on the portal plane.
 */
export function starterCamera(u: number, aspect: number): CameraPose {
  const s = easeInOutCubic(beats.linear('flight', u))
  const y = -(1 - 2 * windowCenter(aspect)) * startHalfHeight(aspect) * (1 - s)
  const z = startDistance(aspect) * (1 - s)
  const position: Vec3 = [0, y, z]
  return { position, target: [0, y, z - 1] }
}

export type ViewRect = { left: number; top: number; width: number; height: number }

/** A rectangle centered on the axis in the plane `z`, as fractions of the viewport (top-left origin). */
function rectAt(aspect: number, w: number, h: number, z: number): ViewRect {
  const half = (startDistance(aspect) - z) * HALF_FOV_TAN
  const camY = starterCamera(0, aspect).position[1]
  const width = w / 2 / (half * aspect)
  const height = h / 2 / half
  const cy = (1 + camY / half) / 2
  return { left: 0.5 - width / 2, top: cy - height / 2, width, height }
}

/** The visible window while the screen waits (u = 0). */
export const windowRect = (aspect: number) => rectAt(aspect, HOLE_W, HOLE_H, PLATE_Z)

/** The whole glass picture, which is what the canvas texture maps onto (a bit larger than the window). */
export const glassRect = (aspect: number) => rectAt(aspect, GLASS_W, GLASS_H, 0)
