export const BASE_Y = -8
export const MAX_HEIGHT = 5

const hash = (x: number, z: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

function valueNoise(x: number, z: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = smooth(x - ix)
  const fz = smooth(z - iz)
  const top = hash(ix, iz) * (1 - fx) + hash(ix + 1, iz) * fx
  const bottom = hash(ix, iz + 1) * (1 - fx) + hash(ix + 1, iz + 1) * fx
  return top * (1 - fz) + bottom * fz
}

/** Integer column height in [0, MAX_HEIGHT]. */
export function heightAt(x: number, z: number) {
  const h = valueNoise(x / 9, z / 9) * 3.6 + valueNoise(x / 4, z / 4) * 1.9
  return Math.min(MAX_HEIGHT, Math.floor(h))
}

export type Surface = 'grass' | 'sand' | 'stone'

/** Top of the water: above the lowest columns (h = 0), below their neighbors. */
export const WATER_Y = BASE_Y + 0.7

/** Surface block kind: ponds in the lowest columns with sandy shores, stone on the peaks. */
export function surfaceAt(x: number, z: number): Surface {
  const h = heightAt(x, z)
  if (h === 0) return 'sand'
  if (h === 1) {
    const nearWater = [
      heightAt(x + 1, z),
      heightAt(x - 1, z),
      heightAt(x, z + 1),
      heightAt(x, z - 1),
    ].some((n) => n === 0)
    if (nearWater) return 'sand'
  }
  if (h >= 5 || (h === 4 && hash(x + 31, z - 17) > 0.45)) return 'stone'
  return 'grass'
}

/** The area where the creature wanders and blows up: kept clear of trees and plants. */
export const STAGE = { x: [-3, 9], z: [-52, -42] } as const
export const inStage = (x: number, z: number) =>
  x >= STAGE.x[0] && x <= STAGE.x[1] && z >= STAGE.z[0] && z <= STAGE.z[1]

/** The strip the camera flies along: no trees, so a crown never fills the screen. */
export const inFlightCorridor = (x: number, z: number) =>
  x >= -3 && x <= 7 && z >= -52 && z <= 8

/**
 * `depth` 0 is the surface block (`surface` says which kind); deeper ones are dirt.
 * `shade` in (0, 1] darkens blocks by depth and in concave corners, and varies the
 * surface slowly across the field, so the unlit blocks still read as lit.
 */
export type Voxel = {
  x: number
  y: number
  z: number
  depth: number
  surface: Surface
  shade: number
}

type Bounds = { x: [number, number]; z: [number, number] }

/** Surface blocks plus enough blocks below to hide gaps against lower neighbors. */
export function buildVoxels({ x, z }: Bounds, maxDepth: number): Voxel[] {
  const voxels: Voxel[] = []
  for (let vx = x[0]; vx < x[1]; vx++) {
    for (let vz = z[0]; vz < z[1]; vz++) {
      const h = heightAt(vx, vz)
      const neighbors = [
        heightAt(vx + 1, vz),
        heightAt(vx - 1, vz),
        heightAt(vx, vz + 1),
        heightAt(vx, vz - 1),
      ]
      const lowest = Math.min(...neighbors)
      const higher = neighbors.filter((n) => n > h).length
      // Slow patches (about 6 blocks wide) plus a little per-block jitter.
      const patch =
        0.9 + 0.1 * valueNoise(vx / 6 + 40, vz / 6 - 40) - 0.03 * hash(vx - 9, vz + 9)
      const surface = surfaceAt(vx, vz)
      const depth = Math.max(1, Math.min(maxDepth, h - lowest + 1))
      for (let d = 0; d < depth; d++) {
        const shade = Math.max(0.55, patch - 0.07 * higher - 0.16 * d)
        voxels.push({
          x: vx,
          y: BASE_Y + h - d,
          z: vz,
          depth: d,
          surface: d === 0 ? surface : 'grass',
          shade,
        })
      }
    }
  }
  return voxels
}

export type TreeKind = 'oak' | 'tall' | 'birch'

export type Tree = { x: number; z: number; groundY: number; kind: TreeKind }

/** Sparse deterministic trees, only on flat grass and never in the camera's flight corridor. */
export function buildTrees({ x, z }: Bounds): Tree[] {
  const trees: Tree[] = []
  for (let vx = x[0] + 2; vx < x[1] - 2; vx++) {
    for (let vz = z[0] + 2; vz < z[1] - 2; vz++) {
      if (hash(vx + 1000, vz - 1000) < 0.982) continue
      if (inFlightCorridor(vx, vz) || surfaceAt(vx, vz) !== 'grass') continue
      const h = heightAt(vx, vz)
      const flat = [
        heightAt(vx + 1, vz),
        heightAt(vx - 1, vz),
        heightAt(vx, vz + 1),
        heightAt(vx, vz - 1),
      ].every((n) => n === h)
      if (!flat) continue
      const k = hash(vx - 500, vz + 500)
      const kind: TreeKind = k < 0.55 ? 'oak' : k < 0.8 ? 'tall' : 'birch'
      trees.push({ x: vx, z: vz, groundY: BASE_Y + h, kind })
    }
  }
  return trees
}

export type Plant = {
  x: number
  y: number
  z: number
  kind: 'tuft' | 'flower'
  variant: number
}

/**
 * Tufts of tall grass and a few flowers on grass blocks. `density` in (0, 1] thins them
 * out on the low tier. Skips trees' trunks (via `blocked`) and the creature's stage.
 */
export function buildPlants(
  { x, z }: Bounds,
  density: number,
  blocked: Set<string>,
): Plant[] {
  const plants: Plant[] = []
  for (let vx = x[0]; vx < x[1]; vx++) {
    for (let vz = z[0]; vz < z[1]; vz++) {
      if (inStage(vx, vz) || surfaceAt(vx, vz) !== 'grass' || blocked.has(`${vx},${vz}`))
        continue
      const r = hash(vx + 77, vz - 55)
      const y = BASE_Y + heightAt(vx, vz) + 0.5
      if (r > 0.965)
        plants.push({
          x: vx,
          y,
          z: vz,
          kind: 'flower',
          variant: Math.floor(hash(vx, vz) * 3),
        })
      else if (r > 0.8 && hash(vx + 5, vz + 5) < density) {
        plants.push({
          x: vx,
          y,
          z: vz,
          kind: 'tuft',
          variant: Math.floor(hash(vx, vz + 3) * 3),
        })
      }
    }
  }
  return plants
}
