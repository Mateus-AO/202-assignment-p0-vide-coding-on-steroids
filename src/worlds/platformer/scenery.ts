import { mulberry32 } from '@/utils/math/random'
import type { Cell } from '@/utils/three/InstancedBlocks'
import type { QualityTier } from '@/utils/three/quality'
import { CASTLE_X, DETAIL, FLAG_X, PIPES, QUESTION_X, RUN_DISTANCE } from './config'

/** The ground runs from here to there; the level and its castle sit in the middle. */
export const X_MIN = -30
export const X_MAX = RUN_DISTANCE + 30

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Stepped hill: `width` blocks at the base, one block narrower per row on each side. */
function hill(x: number, width: number, z: number): Cell[] {
  const cells: Cell[] = []
  for (let row = 0; row < Math.ceil(width / 2); row++) {
    for (let i = row; i < width - row; i++) cells.push([x + i, 0.5 + row, z])
  }
  return cells
}

/** Pixel cloud: a wide base, a narrower middle and a small top bump. */
function cloud(x: number, y: number, z: number, wide = 2): Cell[] {
  return [
    ...range(-wide, wide).map((i): Cell => [x + i, y, z]),
    ...range(1 - wide, wide - 1).map((i): Cell => [x + i, y + 1, z]),
    ...(wide > 1 ? range(-1, 1).map((i): Cell => [x + i, y + 2, z]) : []),
    ...(wide > 2 ? [[x, y + 3, z] as Cell] : []),
    ...(wide <= 1 ? [[x, y + 2, z] as Cell] : []),
  ]
}

/**
 * Evenly spaced pieces of a backdrop layer over [from, to], each a little off its slot and
 * different in size, fixed by `seed`. Backdrop layers slide with the hero (`PARALLAX`), so they
 * are laid out over a span wider than the level.
 */
function scatter(
  from: number,
  to: number,
  spacing: number,
  seed: number,
  make: (x: number, i: number, rng: () => number) => Cell[],
) {
  const rng = mulberry32(seed)
  const cells: Cell[] = []
  for (let x = from, i = 0; x <= to; x += spacing, i++) {
    cells.push(...make(Math.round(x + (rng() - 0.5) * spacing * 0.4), i, rng))
  }
  return cells
}

/** Ground blocks: two rows deep, three blocks thick (z from -1 to 1). Row 0 is the walking surface. */
const groundRow = (y: number) => (pick: (x: number, z: number) => boolean) =>
  range(X_MIN, X_MAX).flatMap((x) =>
    [-1, 0, 1].filter((z) => pick(x, z)).map((z): Cell => [x, y, z]),
  )

/** A cheap hash of a block's place, so the ground's variants fall the same way every time. */
const spot = (x: number, z: number) => {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return h - Math.floor(h)
}

const castle = (): Cell[] => {
  const cells: Cell[] = []
  for (const x of range(CASTLE_X - 3, CASTLE_X + 3)) {
    for (const y of [0.5, 1.5, 2.5, 3.5]) for (const z of [-1, 0]) cells.push([x, y, z])
    if ((x - CASTLE_X) % 2 !== 0) for (const z of [-1, 0]) cells.push([x, 4.5, z]) // battlements
  }
  for (const x of range(CASTLE_X - 1, CASTLE_X + 1)) {
    for (const y of [4.5, 5.5, 6.5]) cells.push([x, y, -0.5])
  }
  for (const x of [CASTLE_X - 1, CASTLE_X + 1]) cells.push([x, 7.5, -0.5])
  return cells
}

/** Soft dark patches on the ground under things that stand on it: x, z, width, depth. */
export const CONTACT_SHADOWS: readonly (readonly [number, number, number, number])[] = [
  ...PIPES.map((x): [number, number, number, number] => [x, 0.15, 3.1, 3.2]),
  [CASTLE_X, 0.35, 8.6, 2.4],
  [FLAG_X, 0, 1.6, 1.6],
]

/** Everything that is just a pile of blocks, grouped by material. */
export function createScenery(quality: QualityTier = 'high') {
  const detail = DETAIL[quality]
  const high = quality === 'high'
  return {
    groundA: groundRow(-0.5)((x, z) => spot(x, z) < 0.78),
    groundB: groundRow(-0.5)((x, z) => spot(x, z) >= 0.78),
    groundDeep: groundRow(-1.5)(() => true),
    // Further rows down, each pair darker, so the ground fades into the earth below it.
    groundDeeper: [-2.5, -3.5].flatMap((y) => groundRow(y)(() => true)),
    groundDeepest: [-4.5, -5.5].flatMap((y) => groundRow(y)(() => true)),
    hills: [
      ...hill(-16, 9, -6),
      ...hill(6, 9, -6),
      ...hill(30, 7, -6),
      ...hill(52, 9, -6),
      ...hill(76, 7, -6),
    ],
    hillsFar: scatter(-44, 100, high ? 15 : 22, 11, (x, i, rng) =>
      hill(x, 9 + 2 * Math.floor(rng() * 3) + (i % 2), -16),
    ),
    mountains: detail.backdrop
      ? scatter(-56, 100, 26, 5, (x, _i, rng) =>
          hill(x, 17 + 2 * Math.floor(rng() * 3), -30),
        )
      : [],
    bushes: [3, 24, 33, 46, 57, 72].flatMap((x) => [
      ...hill(x, 3, -2.3),
      ...hill(x + 3, 5, -2.3),
    ]),
    clouds: scatter(-32, 96, high ? 15 : 24, 21, (x, i) => cloud(x, 9 + (i % 3), -9)),
    cloudsFar: detail.backdrop
      ? scatter(-40, 94, 17, 31, (x, i) => cloud(x, 12 + (i % 2) * 2, -15, 1 + (i % 2)))
      : [],
    bricks: [...range(18, 22), ...range(44, 46)]
      .map((x): Cell => [x, 4.5, 0])
      .filter(([x]) => x !== QUESTION_X),
    castle: castle(),
    pipes: PIPES,
  }
}

export type Scenery = ReturnType<typeof createScenery>
