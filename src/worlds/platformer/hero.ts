import { lerp, smoothstep } from '@/utils/math'
import { FLAG_X, HERO_START, QUESTION_X, RUN_DISTANCE, WALKER_X, PIPES } from './config'

/** The hero's x for local progress `u`. */
export const heroX = (u: number) => HERO_START + u * RUN_DISTANCE

type Jump = { at: number; width: number; height: number }

/** One jump per obstacle, centered on it. Pipes need real height; the rest are hops. */
export const JUMPS: Jump[] = [
  ...PIPES.map((at) => ({ at, width: 6, height: 5.2 })),
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
  return d < 0.9 ? 0.45 * Math.cos((d / 0.9) * (Math.PI / 2)) : 0
}

/** The coin pops out of the block after the bump: height above the block and 0..1 progress. */
export function coinPop(x: number) {
  const t = (x - QUESTION_X) / 2.6
  if (t <= 0 || t >= 1) return null
  return { rise: 2.6 * Math.sin(t * Math.PI) + 0.8, spin: t * 14 }
}

/** A floating coin is gone once the hero reaches it. */
export const coinTaken = (coinX: number, x: number) => x >= coinX - 0.3

/** Height of the flag on the pole: slides down as the hero reaches the goal. */
export function flagHeight(x: number, top: number, bottom: number) {
  return lerp(top, bottom, smoothstep(FLAG_X - 2, FLAG_X, x))
}
