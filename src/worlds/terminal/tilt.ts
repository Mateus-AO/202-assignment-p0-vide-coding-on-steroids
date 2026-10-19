import { clamp } from '@/utils/math'

/** The most the screen turns, in radians (about 10 degrees). */
export const MAX_TILT = 0.17

export type Tilt = { pitch: number; yaw: number }
export type Pointer = { x: number; y: number }

/**
 * Where the screen wants to point. It turns away from the pointer, like a menu in a game:
 * with the pointer on the right the screen faces left, with it high the screen faces down.
 * `pointer` is in [-1, 1] on both axes, y up; null when there is no mouse (phones), where a
 * slow sway driven by progress stands in. With reduced motion it holds still.
 */
export function tiltTarget(
  pointer: Pointer | null,
  u: number,
  reduced: boolean,
  out: Tilt,
): Tilt {
  if (reduced) {
    out.pitch = out.yaw = 0
  } else if (pointer) {
    out.pitch = clamp(pointer.y, -1, 1) * MAX_TILT
    out.yaw = -clamp(pointer.x, -1, 1) * MAX_TILT
  } else {
    out.pitch = Math.sin(u * 11) * MAX_TILT * 0.4
    out.yaw = Math.sin(u * 7 + 1) * MAX_TILT * 0.7
  }
  return out
}
