import type { Cell } from '@/utils/three/InstancedBlocks'
import { CASTLE_X, PIPES, QUESTION_X, RUN_DISTANCE } from './config'

export const X_MIN = -12
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
function cloud(x: number, y: number, z: number): Cell[] {
  return [
    ...range(-2, 2).map((i): Cell => [x + i, y, z]),
    ...range(-1, 1).map((i): Cell => [x + i, y + 1, z]),
    [x, y + 2, z],
  ]
}

/** Ground blocks: two rows deep, three blocks thick (z from -1 to 1). */
const ground = (): Cell[] =>
  range(X_MIN, X_MAX).flatMap((x) =>
    [-0.5, -1.5].flatMap((y) => [-1, 0, 1].map((z): Cell => [x, y, z])),
  )

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

/** Everything that is just a pile of blocks, grouped by material. */
export function createScenery() {
  return {
    ground: ground(),
    hills: [
      ...hill(6, 9, -6),
      ...hill(30, 7, -6),
      ...hill(52, 9, -6),
      ...hill(76, 7, -6),
    ],
    hillsFar: [
      ...hill(-8, 13, -16),
      ...hill(18, 11, -16),
      ...hill(44, 13, -16),
      ...hill(70, 11, -16),
    ],
    bushes: [3, 24, 33, 46, 57, 72].flatMap((x) => [
      ...hill(x, 3, -2.3),
      ...hill(x + 3, 5, -2.3),
    ]),
    clouds: [-4, 8, 22, 36, 50, 64, 78].flatMap((x, i) => cloud(x, 9 + (i % 3), -9)),
    cloudsFar: [2, 16, 31, 44, 58, 72].flatMap((x, i) => cloud(x, 12 + (i % 2) * 2, -15)),
    bricks: [...range(18, 22), ...range(44, 46)]
      .map((x): Cell => [x, 4.5, 0])
      .filter(([x]) => x !== QUESTION_X),
    castle: castle(),
    pipes: PIPES,
  }
}
