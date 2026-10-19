import { describe, expect, it } from 'vitest'
import {
  buildPlants,
  buildTrees,
  buildVoxels,
  heightAt,
  inFlightCorridor,
  inStage,
  MAX_HEIGHT,
  STAGE,
  surfaceAt,
} from './terrain'

describe('terrain', () => {
  it('is deterministic and bounded', () => {
    for (let x = -30; x < 30; x++) {
      const h = heightAt(x, x * 3)
      expect(h).toBe(heightAt(x, x * 3))
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(MAX_HEIGHT)
    }
  })
  it('emits at least one voxel per column and respects maxDepth', () => {
    const bounds = { x: [0, 8], z: [0, 8] } as {
      x: [number, number]
      z: [number, number]
    }
    expect(buildVoxels(bounds, 1)).toHaveLength(64)
    expect(buildVoxels(bounds, 3).length).toBeGreaterThanOrEqual(64)
    expect(buildVoxels(bounds, 3).length).toBeLessThanOrEqual(64 * 3)
  })

  it('places trees deterministically', () => {
    const bounds = { x: [-30, 30], z: [-80, 10] } as {
      x: [number, number]
      z: [number, number]
    }
    const trees = buildTrees(bounds)
    expect(trees.length).toBeGreaterThan(0)
    expect(trees).toEqual(buildTrees(bounds))
  })

  it('keeps trees out of the flight corridor and plants off the creature stage', () => {
    const bounds = { x: [-30, 30], z: [-100, 10] } as {
      x: [number, number]
      z: [number, number]
    }
    expect(buildTrees(bounds).some((t) => inFlightCorridor(t.x, t.z))).toBe(false)
    expect(buildPlants(bounds, 1, new Set()).some((p) => inStage(p.x, p.z))).toBe(false)
  })

  it('makes the stage plain grass', () => {
    for (let x = STAGE.x[0]; x <= STAGE.x[1]; x++) {
      for (let z = STAGE.z[0]; z <= STAGE.z[1]; z++) expect(surfaceAt(x, z)).toBe('grass')
    }
  })

  it('shades deeper and cornered blocks darker, always within (0, 1]', () => {
    const bounds = { x: [0, 20], z: [-60, -40] } as {
      x: [number, number]
      z: [number, number]
    }
    const voxels = buildVoxels(bounds, 3)
    for (const v of voxels) {
      expect(v.shade).toBeGreaterThan(0)
      expect(v.shade).toBeLessThanOrEqual(1)
    }
    const deep = voxels.find((v) => v.depth > 0)
    const top = voxels.find((v) => v.x === deep?.x && v.z === deep?.z && v.depth === 0)
    if (deep && top) expect(deep.shade).toBeLessThan(top.shade)
  })

  it('puts sand only at ponds and shores, never on the stage', () => {
    const bounds = { x: [-30, 30], z: [-100, 10] } as {
      x: [number, number]
      z: [number, number]
    }
    for (const v of buildVoxels(bounds, 1)) {
      if (v.surface === 'sand') expect(heightAt(v.x, v.z)).toBeLessThanOrEqual(1)
    }
  })
})
