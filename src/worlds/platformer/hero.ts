import { lerp, smoothstep } from '@/utils/math'
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
  { at: WALKER_X, width: 4, height: 2.2 },
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

/** A floating coin is gone once the hero reaches it. */
export const coinTaken = (coinX: number, x: number) => x >= coinX - 0.3

/** Height of the flag on the pole: slides down as the hero reaches the goal. */
export function flagHeight(x: number, top: number, bottom: number) {
  return lerp(top, bottom, smoothstep(FLAG_X - FLAG_SLIDE, FLAG_X, x))
}
