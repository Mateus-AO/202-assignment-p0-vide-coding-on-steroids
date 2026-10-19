import { clamp, lerp, smoothstep } from '@/utils/math'
import { beats } from './beats'
import {
  BALL_X_AT_BLOCK,
  BALL_X_AT_PADDLE,
  BALL_Y_AT_WALL,
  HALF_H,
  PADDLE_HALF_H,
  WALL_THICKNESS,
} from './court'

export type HitKind = 'paddleL' | 'paddleR' | 'wall' | 'block'

type Contact = { kind: HitKind; x: number; y: number }

const L = -BALL_X_AT_PADDLE
const R = BALL_X_AT_PADDLE
const T = BALL_Y_AT_WALL
const B = -BALL_Y_AT_WALL

/**
 * The rally, contact by contact. Every segment between contacts keeps the ball clear of the
 * block (x in [0.8, 3.2] and |y| < 1.2 is off limits); the last one ends on its left face. The block's left face is touched twice.
 */
const CONTACTS: Contact[] = [
  { kind: 'paddleL', x: L, y: -1.0 },
  { kind: 'wall', x: -2.6, y: T },
  { kind: 'wall', x: -0.9, y: B },
  { kind: 'wall', x: 0.7, y: T },
  { kind: 'paddleR', x: R, y: 1.0 },
  { kind: 'wall', x: 3.7, y: B },
  { kind: 'paddleL', x: L, y: -1.7 },
  { kind: 'paddleR', x: R, y: -3.0 },
  { kind: 'wall', x: 3.9, y: B },
  { kind: 'paddleL', x: L, y: 2.0 },
  // The block takes two hits: the first leaves it whole; the ball is returned by the
  // left paddle and the second strike (the last contact) starts the crack.
  { kind: 'block', x: BALL_X_AT_BLOCK, y: 0 },
  { kind: 'paddleL', x: L, y: -1.5 },
  { kind: 'block', x: BALL_X_AT_BLOCK, y: 0 },
]

/** After hitting the block the ball ricochets back and settles here. */
const RICOCHET = { x: -2.6, y: -1.5 }

type Waypoint = { u: number; x: number; y: number }

/** Contacts timed by distance travelled, so the ball moves at a constant speed. */
function buildTrack() {
  const lengths = CONTACTS.slice(1).map((c, i) =>
    Math.hypot(c.x - CONTACTS[i].x, c.y - CONTACTS[i].y),
  )
  const total = lengths.reduce((a, b) => a + b, 0)
  const end = beats.ranges.crack[0] // the ball strikes the block as it starts to crack
  let travelled = 0
  const track: Waypoint[] = CONTACTS.map((c, i) => {
    if (i > 0) travelled += lengths[i - 1]
    return { u: (travelled / total) * end, x: c.x, y: c.y }
  })
  track.push({ u: beats.ranges.crack[1], ...RICOCHET })
  return track
}

const TRACK = buildTrack()

/** Every contact with its time. The last one is the block. */
export const HITS: readonly { u: number; kind: HitKind; y: number }[] = CONTACTS.map(
  (c, i) => ({
    u: TRACK[i].u,
    kind: c.kind,
    y: c.y,
  }),
)

/** Progress of the final block strike, the one that breaks it. */
export const BLOCK_HIT_U = HITS[HITS.length - 1].u

type Point = { x: number; y: number }

/** Ball center at progress `u`, written into `out` (no allocation; safe inside useFrame). */
export function ballAtInto(u: number, out: Point): Point {
  const first = TRACK[0]
  if (u <= first.u) {
    out.x = first.x
    out.y = first.y
    return out
  }
  for (let i = 1; i < TRACK.length; i++) {
    const b = TRACK[i]
    if (u <= b.u) {
      const a = TRACK[i - 1]
      const t = (u - a.u) / (b.u - a.u)
      out.x = lerp(a.x, b.x, t)
      out.y = lerp(a.y, b.y, t)
      return out
    }
  }
  const last = TRACK[TRACK.length - 1]
  out.x = last.x
  out.y = last.y
  return out
}

export const ballAt = (u: number): [number, number] => {
  const p = ballAtInto(u, { x: 0, y: 0 })
  return [p.x, p.y]
}

const PADDLE_Y_LIMIT = HALF_H - WALL_THICKNESS / 2 - PADDLE_HALF_H

type Key = { u: number; y: number }

/** Where a paddle must be, and when: its own contacts, starting from the middle. */
function paddleKeys(kind: 'paddleL' | 'paddleR'): Key[] {
  const keys: Key[] = HITS.filter((h) => h.kind === kind).map((h) => ({
    u: h.u,
    y: clamp(h.y, -PADDLE_Y_LIMIT, PADDLE_Y_LIMIT),
  }))
  return keys[0].u > 0 ? [{ u: 0, y: 0 }, ...keys] : keys
}

const KEYS = { paddleL: paddleKeys('paddleL'), paddleR: paddleKeys('paddleR') }

/** Paddle center: waits, then glides to be exactly under the ball at each of its hits. */
export function paddleY(side: 'paddleL' | 'paddleR', u: number) {
  const keys = KEYS[side]
  if (u <= keys[0].u) return keys[0].y
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i].u) {
      const a = keys[i - 1]
      const t = (u - a.u) / (keys[i].u - a.u)
      return lerp(a.y, keys[i].y, smoothstep(0.15, 0.85, t))
    }
  }
  return keys[keys.length - 1].y
}

export const PADDLE_REACH = PADDLE_HALF_H

/** Hits so far by each paddle, written into `out`: the scoreboard. */
export function scoreAtInto(u: number, out: { l: number; r: number }) {
  out.l = 0
  out.r = 0
  for (const h of HITS) {
    if (h.u > u) break
    if (h.kind === 'paddleL') out.l++
    else if (h.kind === 'paddleR') out.r++
  }
  return out
}

/** 0 → 1 → 0 pulse around each hit, for squash and shake. `width` is in progress units. */
export function hitPulse(u: number, kinds: readonly HitKind[], width: number) {
  let pulse = 0
  for (const h of HITS) {
    if (!kinds.includes(h.kind)) continue
    const p = 1 - Math.abs(u - h.u) / width
    if (p > pulse) pulse = p
  }
  return pulse
}

/**
 * How many of the `kinds` hits have happened by `u`, not counting one at the very start (the
 * opening serve is not an impact). A change in this count is what triggers a shake, so the
 * shake depends on the ball crossing a hit and never on how near `u` rests to one.
 */
export function hitsPassed(u: number, kinds: readonly HitKind[]) {
  let n = 0
  for (const h of HITS) if (h.u > 0 && h.u <= u && kinds.includes(h.kind)) n++
  return n
}
