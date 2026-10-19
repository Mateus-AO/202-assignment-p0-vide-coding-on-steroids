import { describe, expect, it } from 'vitest'
import { crackPixelOrder } from './crack'

describe('crackPixelOrder', () => {
  it('is deterministic and stays inside the texture', () => {
    const a = crackPixelOrder(16, 3)
    expect(a).toEqual(crackPixelOrder(16, 3))
    expect(a.length).toBeGreaterThan(20)
    for (const [x, y] of a) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(16)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(16)
    }
  })
  it('never repeats a pixel', () => {
    const a = crackPixelOrder(16)
    expect(new Set(a.map(([x, y]) => `${x},${y}`)).size).toBe(a.length)
  })
})
