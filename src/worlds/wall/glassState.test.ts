import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { fillGlassState, STATE_STRIDE } from './glassState'
import { TV_COUNT } from './layout'

const state = new Float32Array(TV_COUNT * STATE_STRIDE)
const glow = new Float32Array(TV_COUNT)
const at = (i: number, k: number) => state[i * STATE_STRIDE + k]

describe('fillGlassState', () => {
  it('is dark during the hold and lights nothing', () => {
    fillGlassState(0.04, false, state, glow)
    for (let i = 0; i < TV_COUNT; i++) {
      expect(at(i, 0)).toBe(0)
      expect(glow[i]).toBe(0)
      expect(at(i, 3)).toBe(i)
    }
  })

  it('has every set fully on and unscrambled between decode and assemble', () => {
    fillGlassState(0.4, false, state, glow)
    for (let i = 0; i < TV_COUNT; i++) {
      expect([at(i, 0), at(i, 1), at(i, 2)]).toEqual([1, 0, 0])
      expect(glow[i]).toBe(1)
    }
  })

  it('has every set locked into the picture at the end', () => {
    fillGlassState(1, false, state, glow)
    for (let i = 0; i < TV_COUNT; i++) expect([at(i, 1), at(i, 2)]).toEqual([1, 1])
  })

  it('warms the sets one after another, partway through the warm-up', () => {
    const [from, to] = beats.ranges.warm
    fillGlassState((from + to) / 2, false, state, glow)
    const warms = Array.from({ length: TV_COUNT }, (_, i) => at(i, 0))
    expect(Math.max(...warms)).toBeGreaterThan(0.9)
    expect(Math.min(...warms)).toBeLessThan(0.1)
  })

  it('has the sets on at once, after the hold, with reduced motion', () => {
    fillGlassState(beats.ranges.hold[1] - 0.001, true, state, glow)
    expect(at(0, 0)).toBe(0)
    fillGlassState(beats.ranges.hold[1], true, state, glow)
    for (let i = 0; i < TV_COUNT; i++) expect(at(i, 0)).toBe(1)
  })
})
