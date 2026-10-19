import { lerp, smoothstep } from '@/utils/math'
import { mulberry32 } from '@/utils/math/random'
import { beats } from './beats'

/**
 * Nine old TV sets piled in a trapezoid: four on the bottom, three above, two on top. All
 * distances are world units; the pile is centered on x = 0 and its floor is y = 0.
 */
export const ROW_SIZES = [4, 3, 2] as const
export const TV_COUNT = ROW_SIZES.reduce((a, b) => a + b, 0)

/** The glass (the picture area) of one set, before its own scale. 4:3. */
export const SCREEN_W = 1.6
export const SCREEN_H = 1.2
/** Spacing between set centers: a set's body is about 2.0 x 1.6, so neighbors just touch. */
export const PITCH_X = 2.1
export const PITCH_Y = 1.7

/** The picture is a small pixel-art grid; each set shows the slice that sits behind its glass. */
export const PIC_W = 48
export const PIC_H = 28

/** The pile's outline in world units, and what the picture grid covers. */
const HALF_GLASS_W = SCREEN_W / 2
const HALF_GLASS_H = SCREEN_H / 2
const X_MAX = ((ROW_SIZES[0] - 1) / 2) * PITCH_X + HALF_GLASS_W
const Y_MAX = (ROW_SIZES.length - 1) * PITCH_Y + HALF_GLASS_H
const Y_MIN = -HALF_GLASS_H
export const PICTURE_BOUNDS = { x0: -X_MAX, x1: X_MAX, y0: Y_MIN, y1: Y_MAX }
/** Center of the pile, which the camera looks at and the waves spread from. */
export const PILE_CENTER = { x: 0, y: ((ROW_SIZES.length - 1) * PITCH_Y) / 2 }

export type Slot = {
  index: number
  row: number
  col: number
  /** Nominal (unrotated) center of the set. */
  x: number
  y: number
  /** The slice of the picture grid behind this set's glass, in picture pixels (y down). */
  rect: { x0: number; y0: number; x1: number; y1: number }
}

const toPicX = (x: number) =>
  ((x - PICTURE_BOUNDS.x0) / (PICTURE_BOUNDS.x1 - PICTURE_BOUNDS.x0)) * PIC_W
const toPicY = (y: number) =>
  ((PICTURE_BOUNDS.y1 - y) / (PICTURE_BOUNDS.y1 - PICTURE_BOUNDS.y0)) * PIC_H

export const SLOTS: readonly Slot[] = ROW_SIZES.flatMap((count, row) => {
  const before = ROW_SIZES.slice(0, row).reduce((a, b) => a + b, 0)
  return Array.from({ length: count }, (_, col): Slot => {
    const x = (col - (count - 1) / 2) * PITCH_X
    const y = row * PITCH_Y
    return {
      index: before + col,
      row,
      col,
      x,
      y,
      rect: {
        x0: toPicX(x - HALF_GLASS_W),
        x1: toPicX(x + HALF_GLASS_W),
        y0: toPicY(y + HALF_GLASS_H),
        y1: toPicY(y - HALF_GLASS_H),
      },
    }
  })
})

/** How each set was stacked by hand: a small, seeded turn, lean, size and nudge. */
export type SetPose = {
  yaw: number
  roll: number
  scale: number
  dx: number
  dy: number
  dz: number
}

/** Limits of the hand-stacked variation (radians, ratio, world units). */
export const POSE_LIMITS = {
  yaw: 0.17,
  roll: 0.09,
  scale: 0.08,
  dx: 0.06,
  dy: 0.04,
  dz: 0.3,
}

/** Each set's own pose, the same every time. */
export const POSES: readonly SetPose[] = (() => {
  const rng = mulberry32(2024)
  const sym = (limit: number) => (rng() * 2 - 1) * limit
  return SLOTS.map((): SetPose => ({
    yaw: sym(POSE_LIMITS.yaw),
    roll: sym(POSE_LIMITS.roll),
    scale: 1 + sym(POSE_LIMITS.scale),
    dx: sym(POSE_LIMITS.dx),
    dy: sym(POSE_LIMITS.dy),
    dz: sym(POSE_LIMITS.dz),
  }))
})()

/** While the picture assembles the sets ease to this fraction of their tilt. */
export const STRAIGHTEN_TO = 0.4

/** A set's yaw and roll at progress `u`: full tilt, easing to STRAIGHTEN_TO during `assemble`. */
export function tiltAt(index: number, u: number, out: { yaw: number; roll: number }) {
  const k = lerp(
    1,
    STRAIGHTEN_TO,
    smoothstep(beats.ranges.assemble[0], beats.ranges.assemble[1], u),
  )
  out.yaw = POSES[index].yaw * k
  out.roll = POSES[index].roll * k
  return out
}

/** 0 for the set nearest the pile's center, 1 for the farthest: the order the waves run in. */
export const WAVE_RANK: readonly number[] = (() => {
  const dist = SLOTS.map((s) =>
    Math.hypot(s.x - PILE_CENTER.x, (s.y - PILE_CENTER.y) * 1.4),
  )
  const max = Math.max(...dist)
  return dist.map((d) => d / max)
})()

/** Each set's own part of a wave takes this fraction of the beat; the rest is the stagger. */
const WAVE_SHARE = 0.5

/** 0 to 1 per set: 0 is off, 1 fully warmed up. A wave from the center out over `warm`. */
export function warmAmount(index: number, u: number) {
  const [from, to] = beats.ranges.warm
  const len = (to - from) * WAVE_SHARE
  const start = lerp(from, to - len, WAVE_RANK[index])
  return smoothstep(start, start + len, u)
}

/**
 * Per set, during `assemble`: `scramble` 0 to 1 (the text turns to noise), then `lock` 0 to 1
 * (the noise becomes the picture slice). A wave from the center out. Writes into `out`.
 */
export function assembleAmount(
  index: number,
  u: number,
  out: { scramble: number; lock: number },
) {
  const [from, to] = beats.ranges.assemble
  const len = (to - from) * WAVE_SHARE
  const start = lerp(from, to - len, WAVE_RANK[index])
  const t = (u - start) / len
  out.scramble = smoothstep(0, 0.5, t)
  out.lock = smoothstep(0.5, 1, t)
  return out
}
