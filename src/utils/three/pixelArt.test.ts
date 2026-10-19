import { describe, expect, it } from 'vitest'
import { noiseColors } from './pixelArt'

describe('noiseColors', () => {
  it('is deterministic per seed and sized size*size', () => {
    const a = noiseColors([100, 150, 50], 4, 8, 30)
    expect(a).toHaveLength(64)
    expect(a).toEqual(noiseColors([100, 150, 50], 4, 8, 30))
    expect(a).not.toEqual(noiseColors([100, 150, 50], 5, 8, 30))
  })
  it('stays within byte range and within the spread', () => {
    for (const [r, g, b] of noiseColors([250, 5, 128], 1, 8, 60)) {
      for (const c of [r, g, b]) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(255)
      }
    }
    for (const [r] of noiseColors([100, 100, 100], 2, 8, 20)) {
      expect(Math.abs(r - 100)).toBeLessThanOrEqual(10)
    }
  })
})
