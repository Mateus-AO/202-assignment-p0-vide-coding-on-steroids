import { describe, expect, it } from 'vitest'
import { BLINK_LENGTH, BLINK_PERIOD, blinkAt, blinkStart, lookTarget } from './blink'

describe('blinkAt', () => {
  it('is always between 0 and 1 and is 0 before the clock starts', () => {
    expect(blinkAt(-1)).toBe(0)
    expect(blinkAt(NaN)).toBe(0)
    for (let t = 0; t < 60; t += 0.01) {
      const b = blinkAt(t)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })

  it('is deterministic', () => {
    for (const t of [0.3, 1.7, 8.2, 31.4]) expect(blinkAt(t)).toBe(blinkAt(t))
  })

  it('blinks every 3 to 4 seconds, for about 0.15 seconds', () => {
    for (let k = 0; k < 40; k++) {
      const gap = blinkStart(k + 1) - blinkStart(k)
      expect(gap).toBeGreaterThanOrEqual(BLINK_PERIOD - 0.5)
      expect(gap).toBeLessThanOrEqual(BLINK_PERIOD + 0.5)
    }
    let closed = 0
    let blinks = 0
    let wasOpen = true
    const dt = 0.002
    for (let t = 0; t < 70; t += dt) {
      const b = blinkAt(t)
      if (b > 0) closed += dt
      if (b > 0 && wasOpen) blinks++
      wasOpen = b === 0
    }
    expect(blinks).toBeGreaterThanOrEqual(18)
    expect(blinks).toBeLessThanOrEqual(24)
    expect(closed / blinks).toBeGreaterThan(BLINK_LENGTH * 0.8)
    expect(closed / blinks).toBeLessThan(BLINK_LENGTH * 1.05)
  })

  it('closes fully in the middle of a blink', () => {
    let max = 0
    for (let t = blinkStart(2); t < blinkStart(2) + BLINK_LENGTH; t += 0.001)
      max = Math.max(max, blinkAt(t))
    expect(max).toBeGreaterThan(0.99)
  })
})

describe('lookTarget', () => {
  const out = { x: 0, y: 0 }

  it('follows the pointer, clamped', () => {
    lookTarget({ x: 0.4, y: -0.2 }, 3, false, out)
    expect(out).toEqual({ x: 0.4, y: -0.2 })
    lookTarget({ x: 3, y: -3 }, 3, false, out)
    expect(out).toEqual({ x: 1, y: -1 })
  })

  it('drifts slowly without a mouse and looks ahead with reduced motion', () => {
    lookTarget(null, 2, false, out)
    expect(Math.abs(out.x)).toBeLessThan(0.6)
    expect(Math.abs(out.y)).toBeLessThan(0.3)
    lookTarget({ x: 1, y: 1 }, 2, true, out)
    expect(out).toEqual({ x: 0, y: 0 })
  })
})
