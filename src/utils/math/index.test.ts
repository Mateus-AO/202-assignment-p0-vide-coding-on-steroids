import { describe, expect, it } from 'vitest'
import { clamp, damp, easeInOutCubic, lerp, remap, smoothstep } from './index'

describe('math utils', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('lerps', () => expect(lerp(0, 10, 0.5)).toBe(5))
  it('remaps', () => expect(remap(5, 0, 10, 0, 100)).toBe(50))
  it('smoothsteps', () => {
    expect(smoothstep(0.2, 0.8, 0.1)).toBe(0)
    expect(smoothstep(0.2, 0.8, 0.9)).toBe(1)
    expect(smoothstep(0.2, 0.8, 0.5)).toBeCloseTo(0.5)
  })
  it('eases with fixed endpoints', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
  })
})

describe('damp', () => {
  it('eases toward the target at any frame rate', () => {
    expect(damp(0, 1, 0, 8)).toBe(0)
    expect(damp(0, 1, 10, 8)).toBeCloseTo(1)
    const twoSteps = damp(damp(0, 1, 1 / 60, 8), 1, 1 / 60, 8)
    expect(twoSteps).toBeCloseTo(damp(0, 1, 2 / 60, 8))
  })
})
