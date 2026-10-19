/**
 * The arena's floor plan, in world units (one tile = 1; y up; the camera looks from +z toward
 * -z, so "back" is -z and "front", nearest the viewer, is +z). Everything that stands on the
 * floor reads its place from here.
 */

/** Floor tiles: `COLS` along x, `ROWS` along z, centered on the origin. */
export const COLS = 10
export const ROWS = 8
export const HALF_W = COLS / 2
export const HALF_D = ROWS / 2

export const WALL = { thickness: 0.4, height: 0.55 }
/** The wall's center line sits just outside the floor. */
export const WALL_X = HALF_W + WALL.thickness / 2
export const WALL_Z = HALF_D + WALL.thickness / 2

export type GateSide = 'left' | 'right' | 'back'
export type Gate = {
  side: GateSide
  /** Center along the wall: a z for left and right, an x for the back. */
  at: number
  /** Half the opening's width. */
  half: number
}

/** Openings in the wall; each of the four walkers comes in through one (the ball follows the paddle). */
export const GATES = {
  paddle: { side: 'left', at: 0.9, half: 1.1 },
  hero: { side: 'right', at: 1.4, half: 1.0 },
  walker: { side: 'right', at: -2.2, half: 1.0 },
  creature: { side: 'back', at: -2.6, half: 1.0 },
} as const satisfies Record<string, Gate>

/** How far outside the wall's center line a character starts. */
export const OUTSIDE = 1.3

export type Segment = { x: number; z: number; sx: number; sz: number }

/** Sorted [from, to] gaps cut into one wall side. */
const gaps = (side: GateSide) =>
  Object.values(GATES)
    .filter((g) => g.side === side)
    .sort((a, b) => a.at - b.at)
    .map((g) => [g.at - g.half, g.at + g.half])

/** The pieces of one wall side of `length`, with the gaps removed, placed by `place`. */
function pieces(
  length: number,
  side: GateSide,
  place: (mid: number, len: number) => Segment,
): Segment[] {
  const edges = [-length / 2, ...gaps(side).flat(), length / 2]
  const out: Segment[] = []
  for (let i = 0; i < edges.length; i += 2) {
    const len = edges[i + 1] - edges[i]
    if (len > 1e-6) out.push(place((edges[i] + edges[i + 1]) / 2, len))
  }
  return out
}

const T = WALL.thickness
/** The low border wall as box segments (center and size on the floor plane). */
export const WALL_SEGMENTS: Segment[] = [
  // Front, nearest the viewer: solid.
  { x: 0, z: WALL_Z, sx: COLS + 2 * T, sz: T },
  ...pieces(COLS, 'back', (mid, len) => ({ x: mid, z: -WALL_Z, sx: len, sz: T })),
  ...pieces(ROWS, 'left', (mid, len) => ({ x: -WALL_X, z: mid, sx: T, sz: len })),
  ...pieces(ROWS, 'right', (mid, len) => ({ x: WALL_X, z: mid, sx: T, sz: len })),
]

/** Corner pillars (with a flame on top). */
export const PILLARS: [number, number][] = [
  [-WALL_X, -WALL_Z],
  [WALL_X, -WALL_Z],
  [-WALL_X, WALL_Z],
  [WALL_X, WALL_Z],
]
export const PILLAR = { size: 0.7, height: 1.1 }

/** Where a character starts, outside its gate. */
export function entryPoint(gate: Gate): { x: number; z: number } {
  if (gate.side === 'back') return { x: gate.at, z: -WALL_Z - OUTSIDE }
  return { x: (gate.side === 'left' ? -1 : 1) * (WALL_X + OUTSIDE), z: gate.at }
}

/** Props at the edge: the question block against the back wall, coins floating over it. */
export const BLOCK = { x: 0, z: -3.75, size: 0.8 }
export const COINS: [number, number][] = [
  [-1.0, -3.75],
  [0, -3.75],
  [1.0, -3.75],
]
/** The pipe the hero hops, and the bumper the ball rebounds from; both sink at the merge. */
export const PIPE = { x: 2.9, z: 1.4, radius: 0.5, height: 0.7 }
export const SLAB = { x: -0.45, z: 0.9, thickness: 0.3, length: 3.2, height: 0.7 }
