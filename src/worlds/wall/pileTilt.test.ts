import { describe, expect, it } from 'vitest'
import { MAX_PILE_PITCH, MAX_PILE_YAW, pileTiltTarget } from './pileTilt'

describe('pileTiltTarget', () => {
  const out = { pitch: 0, yaw: 0 }

  it('turns toward the pointer, within limits', () => {
    pileTiltTarget({ x: 1, y: 1 }, 0.5, false, out)
    expect(out.yaw).toBeCloseTo(MAX_PILE_YAW)
    expect(out.pitch).toBeCloseTo(-MAX_PILE_PITCH)
    pileTiltTarget({ x: -5, y: -5 }, 0.5, false, out)
    expect(out.yaw).toBeCloseTo(-MAX_PILE_YAW)
    expect(out.pitch).toBeCloseTo(MAX_PILE_PITCH)
  })

  it('sways with progress on touch screens, within limits', () => {
    for (let u = 0; u <= 1; u += 0.05) {
      pileTiltTarget(null, u, false, out)
      expect(Math.abs(out.yaw)).toBeLessThanOrEqual(MAX_PILE_YAW)
      expect(Math.abs(out.pitch)).toBeLessThanOrEqual(MAX_PILE_PITCH)
    }
  })

  it('holds still under reduced motion', () => {
    pileTiltTarget({ x: 1, y: 1 }, 0.5, true, out)
    expect(out).toEqual({ pitch: 0, yaw: 0 })
  })
})
