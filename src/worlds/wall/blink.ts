import { clamp, smoothstep } from '@/utils/math'

/** Seconds between the start windows of two blinks; a blink starts somewhere in the first half-second. */
export const BLINK_PERIOD = 3.5
export const BLINK_JITTER = 0.5
/** How long one blink lasts, in seconds. */
export const BLINK_LENGTH = 0.15
/** The eyelids are fully closed at this fraction of the blink (a quick close, a slower open). */
const CLOSED_AT = 0.4

/** A stable pseudo-random number in [0, 1) for blink number `k` (an integer hash). */
function hash01(k: number) {
  let x = Math.imul(k + 1, 0x9e3779b1)
  x ^= x >>> 15
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/** When blink number `k` starts, in seconds. Gaps between blinks are 3 to 4 seconds. */
export const blinkStart = (k: number) => k * BLINK_PERIOD + hash01(k) * BLINK_JITTER

/**
 * How closed the mascot's eyes are at `seconds`: 0 open, 1 closed. A pure function of the
 * clock, so the schedule is the same every run; one quick blink about every 3 to 4 seconds.
 */
export function blinkAt(seconds: number) {
  if (!(seconds >= 0)) return 0
  const k = Math.floor(seconds / BLINK_PERIOD)
  const t = (seconds - blinkStart(k)) / BLINK_LENGTH
  if (t <= 0 || t >= 1) return 0
  return t < CLOSED_AT ? smoothstep(0, CLOSED_AT, t) : 1 - smoothstep(CLOSED_AT, 1, t)
}

export type Look = { x: number; y: number }
export type PointerLike = { x: number; y: number }

/**
 * Where the pupils want to look, each axis in [-1, 1] (y up). With a mouse they follow it;
 * without one (phones) they drift slowly on the clock; with reduced motion they look
 * straight ahead.
 */
export function lookTarget(
  pointer: PointerLike | null,
  seconds: number,
  reduced: boolean,
  out: Look,
): Look {
  if (reduced) {
    out.x = out.y = 0
  } else if (pointer) {
    out.x = clamp(pointer.x, -1, 1)
    out.y = clamp(pointer.y, -1, 1)
  } else {
    out.x = Math.sin(seconds * 0.35) * 0.55
    out.y = Math.sin(seconds * 0.23 + 1.3) * 0.25
  }
  return out
}
