import type { CameraPose } from '@/core/world'
import { lerp, smoothstep } from '@/utils/math'
import { PILLAR, WALL_X, WALL_Z } from './arena'

/** Half the vertical field of view as a tangent (the canvas uses fov 50). */
export const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

/** The camera looks down at the arena at this angle below the horizon. */
export const PITCH = (65 * Math.PI) / 180
const SIN = Math.sin(PITCH)
const COS = Math.cos(PITCH)
/** View direction and the camera's up, both in the y-z plane (the camera never rolls or yaws). */
const FORWARD = [0, -SIN, -COS] as const
const UP = [0, COS, -SIN] as const

/**
 * What the camera must keep in view: the arena's four outer corners at floor level and at the
 * top of a corner pillar with its flame (the tallest things at the edges), plus a margin.
 */
const MARGIN = 0.35
const REACH_X = WALL_X + MARGIN
const REACH_Z = WALL_Z + MARGIN
const TOP = PILLAR.height + 0.5
export const FRAME_POINTS: readonly (readonly [number, number, number])[] = [
  [-REACH_X, 0, -REACH_Z],
  [REACH_X, 0, -REACH_Z],
  [-REACH_X, 0, REACH_Z],
  [REACH_X, 0, REACH_Z],
  [-REACH_X, TOP, -REACH_Z],
  [REACH_X, TOP, -REACH_Z],
  [-REACH_X, TOP, REACH_Z],
  [REACH_X, TOP, REACH_Z],
]

/** A window on the screen in normalized device coordinates (-1 bottom, +1 top). */
export type Band = { lo: number; hi: number; halfWidth: number }

/**
 * The giant title takes the top 36% of the screen on a wide screen and 38% on a phone (the
 * contract with the title overlay in `app/`), so from the merge on the whole arena lives in the
 * rest, with a small margin.
 */
export function titleBand(aspect: number): Band {
  const share = lerp(0.38, 0.36, smoothstep(0.5, 1.5, aspect))
  return { lo: -0.95, hi: 1 - 2 * share - 0.04, halfWidth: 0.94 }
}

/** Before the merge the arena fills the screen above the caption box at the bottom. */
export function openBand(aspect: number): Band {
  return {
    lo: lerp(-0.42, -0.55, smoothstep(0.5, 1.5, aspect)),
    hi: 0.92,
    halfWidth: 0.94,
  }
}

/** The camera's distance back from the arena center and how far it is lifted along its up. */
export type Fit = { distance: number; shift: number }

type Extents = { minY: number; maxY: number; maxX: number }

function extents(distance: number, shift: number, aspect: number): Extents {
  let minY = Infinity
  let maxY = -Infinity
  let maxX = 0
  for (const [x, y, z] of FRAME_POINTS) {
    const depth = y * FORWARD[1] + z * FORWARD[2] + distance
    const up = y * UP[1] + z * UP[2] - shift
    const ny = up / (depth * HALF_FOV_TAN)
    minY = Math.min(minY, ny)
    maxY = Math.max(maxY, ny)
    maxX = Math.max(maxX, Math.abs(x) / (depth * HALF_FOV_TAN * aspect))
  }
  return { minY, maxY, maxX }
}

/**
 * The closest camera that keeps every frame point inside `band`, found by bisection: for each
 * distance the lift that centers the arena in the band, then the smallest distance that fits.
 */
export function fitBand(aspect: number, band: Band): Fit {
  const mid = (band.lo + band.hi) / 2
  const centered = (distance: number) => {
    let lo = -80
    let hi = 80
    for (let i = 0; i < 40; i++) {
      const shift = (lo + hi) / 2
      const e = extents(distance, shift, aspect)
      // A larger lift moves the picture down, so the middle falls as the lift grows.
      if ((e.minY + e.maxY) / 2 > mid) lo = shift
      else hi = shift
    }
    return (lo + hi) / 2
  }
  const fits = (distance: number) => {
    const e = extents(distance, centered(distance), aspect)
    return e.maxY - e.minY <= band.hi - band.lo && e.maxX <= band.halfWidth
  }
  let near = 4
  let far = 400
  for (let i = 0; i < 40; i++) {
    const distance = (near + far) / 2
    if (fits(distance)) far = distance
    else near = distance
  }
  return { distance: far, shift: centered(far) }
}

/** The two fits are recomputed only when the aspect changes. */
const cache = {
  aspect: NaN,
  open: { distance: 0, shift: 0 } as Fit,
  title: { distance: 0, shift: 0 } as Fit,
}

/**
 * Top-down, tilted 65 degrees: the whole arena in the open band at first; as the party forms the
 * camera backs off and slides so the arena sits in the lower part of the screen (the title band),
 * ready for the giant title above it. Takes the aspect so phones and wide screens both keep every
 * wall in view.
 */
export function arenaCamera(u: number, aspect: number): CameraPose {
  if (cache.aspect !== aspect) {
    cache.open = fitBand(aspect, openBand(aspect))
    cache.title = fitBand(aspect, titleBand(aspect))
    cache.aspect = aspect
  }
  const t = smoothstep(0.46, 0.55, u)
  const distance = lerp(cache.open.distance, cache.title.distance, t)
  const shift = lerp(cache.open.shift, cache.title.shift, t)
  const position: [number, number, number] = [
    0,
    -FORWARD[1] * distance + UP[1] * shift,
    -FORWARD[2] * distance + UP[2] * shift,
  ]
  const target: [number, number, number] = [
    position[0] + FORWARD[0],
    position[1] + FORWARD[1],
    position[2] + FORWARD[2],
  ]
  return { position, target }
}
