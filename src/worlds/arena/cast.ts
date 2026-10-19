import { clamp, lerp, smoothstep } from '@/utils/math'
import { entryPoint, GATES, PIPE, SLAB } from './arena'
import { beats } from './beats'
import { GLYPH_INSIDE } from './glyph'

/**
 * The cast and its dance, as pure functions of the world's progress `u`: they walk in through
 * the gates (`arrive`), take their stations and each does its signature move (`party`), drift
 * into the symbol on the floor (`merge`) and stand still (`title`). Nothing here keeps state, so
 * scrubbing either way gives the same picture.
 */

export type CastId = 'paddle' | 'ball' | 'hero' | 'creature' | 'walker'
export const CAST: readonly CastId[] = ['paddle', 'ball', 'hero', 'creature', 'walker']

export type Pose = {
  x: number
  /** Height above the floor: a hop, the ball's arc, a sinking prop. */
  y: number
  z: number
  /** Heading about the y axis; 0 faces the camera (+z). */
  yaw: number
  /** 0 while hidden, 1 once it has appeared. */
  scale: number
  /** How hard it is walking, [0, 1]: scales the stride. */
  walk: number
  /** Gait phase in radians (follows progress, so legs stop when scrolling stops). */
  phase: number
  /** 1 while airborne in a hop. */
  air: number
}

export const newPose = (): Pose => ({
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  scale: 0,
  walk: 0,
  phase: 0,
  air: 0,
})

/** Radians of gait per unit of progress. */
export const GAIT = 300

/** When each character walks in: a window inside `arrive`. */
export const ARRIVE: Record<CastId, readonly [number, number]> = {
  paddle: [0.04, 0.2],
  ball: [0.09, 0.25],
  hero: [0.07, 0.23],
  creature: [0.1, 0.26],
  walker: [0.12, 0.27],
}

/** When each character drifts into the symbol: starts inside `merge`, all done before `title`. */
export const MERGE_LENGTH = 0.17
export const MERGE_START: Record<CastId, number> = {
  paddle: beats.ranges.merge[0],
  ball: beats.ranges.merge[0] + 0.01,
  hero: beats.ranges.merge[0] + 0.02,
  creature: beats.ranges.merge[0] + 0.03,
  walker: beats.ranges.merge[0] + 0.04,
}

/** Where each character stands at the end, inside the symbol, and where it faces. */
export const TABLEAU: Record<CastId, { x: number; z: number; yaw: number }> = {
  creature: { x: GLYPH_INSIDE.x, z: GLYPH_INSIDE.z - 1.0, yaw: 0 },
  hero: { x: GLYPH_INSIDE.x - 1.3, z: GLYPH_INSIDE.z + 0.1, yaw: 0.4 },
  walker: { x: GLYPH_INSIDE.x + 1.3, z: GLYPH_INSIDE.z + 0.1, yaw: -0.4 },
  paddle: { x: GLYPH_INSIDE.x - 0.3, z: GLYPH_INSIDE.z + 1.45, yaw: Math.PI / 2 },
  ball: { x: GLYPH_INSIDE.x + 1.1, z: GLYPH_INSIDE.z + 1.5, yaw: 0 },
}

/** The merge drift curves a little off the straight line; the sign alternates per character. */
const BULGE: Record<CastId, number> = {
  paddle: 0.6,
  ball: -0.5,
  hero: 0.7,
  creature: -0.6,
  walker: 0.6,
}

/** The paddle returns the ball against the bumper: passes of the ball across the rally lane. */
const PADDLE_THICKNESS = 0.4
const BALL_SIZE = 0.42
const PADDLE_X = -4.3
export const RALLY = {
  z: 0.9,
  amp: 1.0,
  paddleX: PADDLE_X,
  /** The ball's center when it touches the paddle's face, and the bumper's. */
  ballMinX: PADDLE_X + PADDLE_THICKNESS / 2 + BALL_SIZE / 2,
  ballMaxX: SLAB.x - SLAB.thickness / 2 - BALL_SIZE / 2,
  /** Round trips (paddle, bumper, paddle) during the party. */
  trips: 3,
  /** How far the paddle lags the ball sideways, as a share of the party. */
  lag: 0.01,
  ballSize: BALL_SIZE,
  paddleThickness: PADDLE_THICKNESS,
  paddleLength: 1.7,
}

/** The hero walks to and fro along the pipe's row and hops it each time he crosses. */
export const HERO_LANE = {
  z: PIPE.z,
  minX: 0.8,
  maxX: 4.6,
  trips: 1.5,
  hop: 0.95,
  reach: 0.8,
}

/** The walker patrols a row at the back right. */
export const PATROL = { z: -2.2, minX: 1.4, maxX: 4.4, trips: 1.5 }

/** The creature wanders a loop at the back left. */
export const WANDER = { x: -2.6, z: -2.2, rx: 1.5, rz: 0.9 }

const TAU = Math.PI * 2
const fract = (t: number) => t - Math.floor(t)
/** 0 at integer t, 1 at half-integers, linear between. */
export const triangle = (t: number) => 1 - Math.abs(1 - 2 * fract(t))
/** 1 at integer t, 0 at half-integers, smooth: a pace that slows at both ends. */
const swing = (t: number) => 0.5 + 0.5 * Math.cos(TAU * t)

/** Walking in, eased a little at both ends but mostly steady. */
const steady = (t: number) => lerp(t, smoothstep(0, 1, t), 0.4)

const window01 = (u: number, [from, to]: readonly [number, number]) =>
  clamp((u - from) / (to - from), 0, 1)

/** Progress through a character's merge drift, eased, in [0, 1]. */
export const mergeAmount = (id: CastId, u: number) =>
  smoothstep(MERGE_START[id], MERGE_START[id] + MERGE_LENGTH, u)

/** The ball's place in the rally at party progress `s`, [0, 1]. */
export function rallyBall(s: number, out: { x: number; z: number; y: number }) {
  const t = s * RALLY.trips
  out.x = lerp(RALLY.ballMinX, RALLY.ballMaxX, triangle(t))
  out.z = RALLY.z + RALLY.amp * Math.sin(TAU * (s * 2.2 + 0.1))
  out.y = 0.28 * Math.sin(Math.PI * fract(t * 2))
}

/** The hero's height over the pipe at floor position x. */
export function hopHeight(x: number) {
  const k = (x - PIPE.x) / HERO_LANE.reach
  return Math.abs(k) < 1 ? HERO_LANE.hop * (1 - k * k) : 0
}

const ball = { x: 0, z: 0, y: 0 }

/** Where the character stands at progress `u` (x, y, z, scale, plus the paddle's turn). */
function place(id: CastId, u: number, out: Pose) {
  const s = beats.linear('party', u)
  const a = steady(window01(u, ARRIVE[id]))
  const m = mergeAmount(id, u)
  const gate = GATES[id === 'ball' ? 'paddle' : id]
  const entry = entryPoint(gate)
  const entryX = id === 'ball' ? entry.x - 0.5 : entry.x

  // Station during the party.
  let x = 0
  let z = 0
  let y = 0
  switch (id) {
    case 'ball':
      rallyBall(s, ball)
      x = ball.x
      z = ball.z
      y = ball.y
      break
    case 'paddle':
      rallyBall(clamp(s - RALLY.lag, 0, 1), ball)
      x = RALLY.paddleX
      z = ball.z
      break
    case 'hero':
      x = lerp(HERO_LANE.minX, HERO_LANE.maxX, swing(s * HERO_LANE.trips))
      z = HERO_LANE.z
      y = hopHeight(x) * (1 - smoothstep(0, 0.3, beats.linear('merge', u)))
      break
    case 'walker':
      x = lerp(PATROL.minX, PATROL.maxX, swing(s * PATROL.trips))
      z = PATROL.z
      break
    case 'creature':
      x = WANDER.x + WANDER.rx * Math.sin(TAU * s + 0.6)
      z = WANDER.z + WANDER.rz * Math.sin(TAU * 1.5 * s)
      break
  }

  // Walking in from outside the gate (a = 0) to the station (a = 1) ...
  x = lerp(entryX, x, a)
  z = lerp(entry.z, z, a)
  y *= a
  // ... and, at the end, drifting into the symbol.
  if (m > 0) {
    const to = TABLEAU[id]
    const dx = to.x - x
    const dz = to.z - z
    const len = Math.hypot(dx, dz) || 1
    const bulge = Math.sin(Math.PI * m) * BULGE[id]
    x = lerp(x, to.x, m) - (dz / len) * bulge
    z = lerp(z, to.z, m) + (dx / len) * bulge
    y *= 1 - m
  }

  out.x = x
  out.y = y
  out.z = z
  out.scale = smoothstep(ARRIVE[id][0], ARRIVE[id][0] + 0.02, u)
}

const before = newPose()
const after = newPose()
const EPS = 0.0008
/** Below this speed (floor units per unit of progress) the character stands. */
const STILL = 1.2
const WALKING = 6

/** The shortest-way blend between two angles. */
function turn(from: number, to: number, t: number) {
  const d = ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI
  return from + d * t
}

/**
 * The full pose of `id` at progress `u`, written into `out` (nothing is allocated). The heading
 * and the stride come from the path itself: it faces where it goes and walks only while it moves.
 */
export function poseAt(id: CastId, u: number, out: Pose): Pose {
  place(id, u, out)
  place(id, u - EPS, before)
  place(id, u + EPS, after)
  const vx = (after.x - before.x) / (2 * EPS)
  const vz = (after.z - before.z) / (2 * EPS)
  const speed = Math.hypot(vx, vz)
  const m = mergeAmount(id, u)
  const walk = smoothstep(STILL, WALKING, speed)

  if (id === 'paddle') {
    // Slides sideways, standing across its lane; turns to lie along x in the symbol.
    out.yaw = lerp(0, TABLEAU.paddle.yaw, m)
    out.walk = 0
  } else if (id === 'ball') {
    out.yaw = 0
    out.walk = 0
  } else {
    const rest = lerp(0, TABLEAU[id].yaw, m)
    out.yaw = turn(rest, Math.atan2(vx, vz), walk)
    out.walk = walk
  }
  out.phase = u * GAIT
  out.air = out.y > 0.06 && id === 'hero' ? 1 : 0
  return out
}

/** How far the pipe and the bumper have sunk into the floor (0 up, 1 gone), as the merge starts. */
export const sinkAmount = (u: number) => smoothstep(0, 0.25, beats.linear('merge', u))

/** The progress values at which the ball meets the paddle or the bumper. */
export function rallyContacts(): { u: number; kind: 'paddle' | 'bumper' }[] {
  const [from, to] = beats.ranges.party
  const out: { u: number; kind: 'paddle' | 'bumper' }[] = []
  for (let k = 0; k <= RALLY.trips * 2; k++) {
    out.push({
      u: from + ((to - from) * k) / (RALLY.trips * 2),
      kind: k % 2 === 0 ? 'paddle' : 'bumper',
    })
  }
  return out
}

/** The progress values at which the hero takes off over the pipe. */
export function hopTakeoffs(): number[] {
  const out: number[] = []
  const pose = newPose()
  let was = 0
  for (let u = 0; u <= 1; u += 0.0002) {
    place('hero', u, pose)
    const now = pose.y > 0 ? 1 : 0
    if (now && !was) out.push(u)
    was = now
  }
  return out
}

/** The progress values at which the walker turns round at the end of its patrol. */
export function patrolTurns(): number[] {
  const [from, to] = beats.ranges.party
  // The path turns at every half trip except the last, where the merge takes over.
  const turns = Math.floor(PATROL.trips * 2) - 1
  return Array.from({ length: turns }, (_, k) =>
    lerp(from, to, (k + 1) / (PATROL.trips * 2)),
  )
}
