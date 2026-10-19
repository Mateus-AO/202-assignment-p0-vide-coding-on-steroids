import { clamp } from '@/utils/math'

/** The most the whole pile turns toward the pointer, in radians. */
export const MAX_PILE_YAW = 0.1
export const MAX_PILE_PITCH = 0.06

export type PileTilt = { pitch: number; yaw: number }
export type Pointer = { x: number; y: number }

/**
 * Where the pile wants to point. It turns toward the pointer a little, as if watching it:
 * pointer on the right, the pile faces right; pointer high, it tips back to face up.
 * `pointer` is in [-1, 1] on both axes, y up; null when there is no mouse (phones), where a
 * slow sway driven by progress stands in. With reduced motion it holds still.
 */
export function pileTiltTarget(
  pointer: Pointer | null,
  u: number,
  reduced: boolean,
  out: PileTilt,
): PileTilt {
  if (reduced) {
    out.pitch = out.yaw = 0
  } else if (pointer) {
    out.yaw = clamp(pointer.x, -1, 1) * MAX_PILE_YAW
    out.pitch = -clamp(pointer.y, -1, 1) * MAX_PILE_PITCH
  } else {
    out.yaw = Math.sin(u * 9 + 1) * MAX_PILE_YAW * 0.6
    out.pitch = Math.sin(u * 6) * MAX_PILE_PITCH * 0.4
  }
  return out
}
