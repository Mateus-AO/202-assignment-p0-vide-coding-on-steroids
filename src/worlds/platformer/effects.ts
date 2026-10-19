import { COIN_XS, QUESTION_X } from './config'
import { heroY, JUMPS } from './hero'

/** What a puff of particles looks like. */
export type Emitter = {
  /** The hero's x at which it goes off; it plays over the next `life` blocks of his run. */
  at: number
  origin: readonly [x: number, y: number, z: number]
  count: number
  life: number
  /** How far it spreads sideways, and how high it throws, in blocks. */
  spread: number
  lift: number
  /** How far it falls back by the end (blocks). */
  fall: number
  size: number
  /** 0 gold sparkle, 1 white, 2 dust. */
  kind: 0 | 1 | 2
  /** `ground` puffs stay low and fan along the ground; the rest burst out in a ring. */
  ground: boolean
}

const dust = (at: number, x: number): Emitter => ({
  at,
  origin: [x, 0.12, 0.2],
  count: 4,
  life: 1.1,
  spread: 0.9,
  lift: 0.35,
  fall: 0.1,
  size: 0.2,
  kind: 2,
  ground: true,
})

/**
 * Every puff in the level: dust at each take-off and landing, a gold burst where each floating
 * coin is taken, and a few sparks where the block is hit. They all go off at fixed values of the
 * hero's x, so they are as scrubbable as the rest.
 */
export const EMITTERS: readonly Emitter[] = [
  ...JUMPS.flatMap(({ at, width }) => [
    dust(at - width / 2, at - width / 2),
    dust(at + width / 2, at + width / 2),
  ]),
  ...COIN_XS.map((cx): Emitter => ({
    at: cx - 0.3,
    origin: [cx, heroY(cx) + 1.5, 0.2],
    count: 5,
    life: 1,
    spread: 0.7,
    lift: 0.9,
    fall: 0.4,
    size: 0.16,
    kind: 0,
    ground: false,
  })),
  {
    at: QUESTION_X,
    origin: [QUESTION_X, 5.1, 0.55],
    count: 6,
    life: 1.3,
    spread: 0.9,
    lift: 0.9,
    fall: 0.7,
    size: 0.16,
    kind: 1,
    ground: false,
  },
]

type Slot = { emitter: Emitter; index: number }

/** One entry per particle across every emitter: the scene draws exactly this many instances. */
export const SLOTS: readonly Slot[] = EMITTERS.flatMap((emitter) =>
  Array.from({ length: emitter.count }, (_, index) => ({ emitter, index })),
)

export type Particle = { x: number; y: number; z: number; size: number; spin: number }

/**
 * Writes where particle `slot` is when the hero is at `x` into `out`; false while it is not
 * alive (before it goes off or after it has faded). Allocates nothing.
 */
export function particleAt(slot: Slot, x: number, out: Particle) {
  const { emitter: e, index } = slot
  const a = (x - e.at) / e.life
  if (a <= 0 || a >= 1) return false
  // Each particle gets its own direction and a little variety in speed, fixed by its index.
  const angle = ((index + 0.5) / e.count) * Math.PI * (e.ground ? 1 : 2)
  const vary = 0.65 + (0.35 * ((index * 7) % 5)) / 4
  const out01 = Math.sqrt(a) * vary
  out.x = e.origin[0] + Math.cos(angle) * e.spread * out01
  out.z =
    e.origin[2] +
    (e.ground ? (index % 2 ? 0.25 : -0.05) * a : Math.sin(angle) * e.spread * 0.3 * out01)
  const rise = e.ground ? Math.sin(angle) : 1
  out.y = Math.max(
    0.05,
    e.origin[1] + e.lift * rise * 4 * a * (1 - a) * vary - e.fall * a * a,
  )
  out.size = e.size * (1 - a) * (0.7 + 0.3 * vary)
  out.spin = a * 5 + index
  return true
}
