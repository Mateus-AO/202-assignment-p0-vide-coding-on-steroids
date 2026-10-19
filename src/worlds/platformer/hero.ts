import { clamp, lerp, smoothstep } from '@/utils/math'
import { beats } from './beats'
import {
  BUMP_HEIGHT,
  CASTLE_X,
  COIN_RISE,
  END_Z,
  FLAG_SLIDE,
  FLAG_X,
  HERO_START,
  LANE_Z,
  PIPE_JUMP,
  PIPES,
  QUESTION_X,
  RUN_DISTANCE,
  WALKER_LAP,
  WALKER_PACE,
  WALKER_X,
} from './config'

/** Where the run ends: just past the goal flag. */
export const RUN_END_X = HERO_START + RUN_DISTANCE

/** The hero's x for local progress `u`: the run, then the walk on to the castle door. */
export const heroX = (u: number) =>
  HERO_START +
  RUN_DISTANCE * beats.linear('run', u) +
  (CASTLE_X - RUN_END_X) * beats.linear('approach', u)

/**
 * The progress at which the hero is at `x`: the inverse of `heroX`, from the start to the
 * castle door (after that he stands still, so there is no single answer). Sound cues use it to
 * sit exactly where he reaches something.
 */
export function uAtX(x: number) {
  const [runFrom, runTo] = beats.ranges.run
  const [walkFrom, walkTo] = beats.ranges.approach
  return x <= RUN_END_X
    ? lerp(runFrom, runTo, (x - HERO_START) / RUN_DISTANCE)
    : lerp(walkFrom, walkTo, (x - RUN_END_X) / (CASTLE_X - RUN_END_X))
}

/** 0 on the run, 1 once he has stepped over to the lane in front of the castle wall. */
const laneBlend = (u: number) => smoothstep(RUN_END_X, RUN_END_X + 1.8, heroX(u))

/** The hero's z: toward the camera as he walks to the door, then straight into it. */
export const heroZ = (u: number) =>
  LANE_Z * laneBlend(u) - (LANE_Z - END_Z) * beats.linear('enter', u)

/** Turn about the vertical axis: 0 faces along the run, a quarter turn faces the door. */
export const heroTurn = (u: number) => (Math.PI / 2) * beats.smooth('turn', u)

/** Distance walked so far, for the leg swing; it stops when scrolling stops or he stands still. */
export const heroTravel = (u: number) =>
  heroX(u) + LANE_Z * laneBlend(u) + (LANE_Z - END_Z) * beats.linear('enter', u)

type Jump = { at: number; width: number; height: number }

/** One jump per obstacle, centered on it. Pipes need real height; the rest are hops. */
export const JUMPS: Jump[] = [
  ...PIPES.map((at) => ({ at, ...PIPE_JUMP })),
  { at: QUESTION_X, width: 4, height: 1.9 },
  { at: WALKER_X, width: 5, height: 2.8 },
  { at: FLAG_X - 3, width: 4, height: 2 },
]

/** Height of the hero's feet above the ground at x: a parabola per jump. */
export function heroY(x: number) {
  let y = 0
  for (const { at, width, height } of JUMPS) {
    const t = (x - (at - width / 2)) / width
    if (t > 0 && t < 1) y = Math.max(y, 4 * height * t * (1 - t))
  }
  return y
}

/**
 * Where a jump is in its arc at `x`: 0 at take-off to 1 at landing, or -1 when the hero is not
 * in one. The pose (stretch, squash, arms up) reads it.
 */
export function jumpProgress(x: number) {
  for (const { at, width } of JUMPS) {
    const t = (x - (at - width / 2)) / width
    if (t > 0 && t < 1) return t
  }
  return -1
}

/**
 * The hero's squash and stretch as a change in height (0 at rest): a crouch just before a
 * jump, a stretch while he rises, a squash as he lands that settles over half a block.
 */
export function heroSquash(x: number) {
  for (const { at, width } of JUMPS) {
    const start = at - width / 2
    const end = at + width / 2
    const crouch = (x - (start - 0.45)) / 0.45
    if (crouch > 0 && crouch < 1) return -0.12 * Math.sin(crouch * Math.PI)
    const t = (x - start) / width
    if (t >= 0 && t < 1) return 0.1 * Math.sin(t * Math.PI)
    const land = (x - end) / 0.6
    if (land >= 0 && land < 1) return -0.14 * Math.sin(land * Math.PI) * (1 - land)
  }
  return 0
}

/** 0 to 1 and back: arms up as he reaches the goal pole. */
export const heroCheer = (x: number) =>
  smoothstep(FLAG_X - 0.6, FLAG_X, x) - smoothstep(FLAG_X + 1.2, FLAG_X + 1.8, x)

/**
 * How much of the stride he shows: 1 while he moves, 0 while he stands turning to the door, so he
 * is never frozen mid-step with his arms swinging. It eases out as the turn starts and back in as
 * he sets off into the doorway.
 */
export const heroStride = (u: number) =>
  1 -
  smoothstep(0, 0.25, beats.linear('turn', u)) *
    (1 - smoothstep(0, 0.25, beats.linear('enter', u)))

/** Running animation phase; advances with distance so the hero stops when scrolling stops. */
export const runPhase = (x: number) => x * 2.4

/** How far the question block is knocked up (0 at rest), peaking as the hero passes under it. */
export function blockBump(x: number) {
  const d = Math.abs(x - QUESTION_X)
  return d < 0.9 ? BUMP_HEIGHT * Math.cos((d / 0.9) * (Math.PI / 2)) : 0
}

/** The coin pops out of the block after the bump: height above the block and 0..1 progress. */
export function coinPop(x: number) {
  const t = (x - QUESTION_X) / 2.6
  if (t <= 0 || t >= 1) return null
  return { rise: COIN_RISE * Math.sin(t * Math.PI) + 0.8, spin: t * 14 }
}

/** A floating coin is taken once the hero reaches it. */
export const coinTaken = (coinX: number, x: number) => x >= coinX - 0.3

/** A taken coin flies up toward his head and shrinks away: 0 untouched, 1 gone. */
export const coinCollect = (coinX: number, x: number) => clamp(x - (coinX - 0.3), 0, 1)

/** The spin of a coin, per block of the hero's run, so scrolling spins it and standing still doesn't. */
export const coinSpin = (x: number, i: number) => x * 2.4 + i

/** The question block has been hit once the hero has passed under it. */
export const blockHit = (x: number) => x >= QUESTION_X

/** The walker's x: it paces to and fro around WALKER_X as the hero runs (pure in his x). */
export const walkerX = (x: number) =>
  WALKER_X + WALKER_PACE * Math.sin((x / WALKER_LAP) * 2 * Math.PI)

/** The walker's waddle phase: its feet go up and down with the hero's distance run. */
export const walkerStep = (x: number) => x * 4

/** Which way it faces: 0 when it paces toward -x (the way its face points), pi toward +x. */
export function walkerYaw(x: number) {
  const dir = Math.cos((x / WALKER_LAP) * 2 * Math.PI)
  return Math.PI * smoothstep(-0.25, 0.25, dir)
}

/** Height of the flag on the pole: slides down as the hero reaches the goal. */
export function flagHeight(x: number, top: number, bottom: number) {
  return lerp(top, bottom, smoothstep(FLAG_X - FLAG_SLIDE, FLAG_X, x))
}
