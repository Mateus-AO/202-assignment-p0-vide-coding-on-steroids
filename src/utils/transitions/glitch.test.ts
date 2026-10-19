import { describe, expect, it } from 'vitest'
import {
  GLITCH_BRIGHT_CAP,
  GLITCH_FULL_AT,
  GLITCH_HOLD,
  GLITCH_STEPS,
  brightShare,
  glitchShape,
  glitchStep,
  glitchStepTime,
} from './glitch'

const samples = Array.from({ length: 401 }, (_, i) => i / 400)

describe('glitchStep', () => {
  it('cuts each phase into frozen steps, first to last', () => {
    expect(glitchStep(0)).toBe(0)
    expect(glitchStep(1)).toBe(GLITCH_STEPS - 1)
    expect(glitchStep(1 / GLITCH_STEPS - 1e-9)).toBe(0)
    expect(glitchStep(1 / GLITCH_STEPS)).toBe(1)
    expect(glitchStep(-3)).toBe(0)
    expect(glitchStep(7)).toBe(GLITCH_STEPS - 1)
  })

  it('stands for phase 0 at the first step and 1 at the last', () => {
    expect(glitchStepTime(0)).toBe(0)
    expect(glitchStepTime(GLITCH_STEPS - 1)).toBe(1)
  })
})

describe('glitchShape', () => {
  it('shows nothing at the start of the cover and at the end of the reveal', () => {
    for (const s of [glitchShape(1, 0), glitchShape(2, 1)]) {
      expect(s.cover).toBe(0)
      expect(s.activity).toBe(0)
    }
  })

  it('is fully opaque at the swap, whichever side of it you stand', () => {
    expect(glitchShape(1, 1).cover).toBe(1)
    expect(glitchShape(2, 0).cover).toBe(1)
  })

  it('stays fully opaque for the last part of phase 1 and the first part of phase 2', () => {
    for (const t of samples) {
      if (t >= GLITCH_FULL_AT + 1 / GLITCH_STEPS) expect(glitchShape(1, t).cover).toBe(1)
      if (t <= GLITCH_HOLD) expect(glitchShape(2, t).cover).toBe(1)
    }
  })

  it('only darkens while covering and only clears while revealing (no strobe)', () => {
    let a = glitchShape(1, 0).cover
    let b = glitchShape(2, 0).cover
    for (const t of samples) {
      const ca = glitchShape(1, t).cover
      const cb = glitchShape(2, t).cover
      expect(ca).toBeGreaterThanOrEqual(a - 1e-12)
      expect(cb).toBeLessThanOrEqual(b + 1e-12)
      a = ca
      b = cb
    }
  })

  it('is constant inside a step, so a scrub is stable and reproducible', () => {
    for (let k = 0; k < GLITCH_STEPS; k++) {
      const a = glitchShape(1, (k + 0.05) / GLITCH_STEPS)
      const b = glitchShape(1, (k + 0.95) / GLITCH_STEPS)
      expect(b).toEqual(a)
    }
    expect(glitchShape(2, 0.37)).toEqual(glitchShape(2, 0.37))
  })

  it('uses different seeds for the two phases', () => {
    expect(glitchShape(1, 0.5).seed).not.toBe(glitchShape(2, 0.5).seed)
  })

  it('keeps cover and activity in [0, 1] and the channel split small', () => {
    for (const mode of [1, 2] as const)
      for (const t of samples) {
        const s = glitchShape(mode, t)
        expect(s.cover).toBeGreaterThanOrEqual(0)
        expect(s.cover).toBeLessThanOrEqual(1)
        expect(s.activity).toBeGreaterThanOrEqual(0)
        expect(s.activity).toBeLessThanOrEqual(1)
        expect(s.split).toBeLessThan(0.02)
      }
  })

  it('never lights more than a fifth of the screen with bars, blocks and fringes', () => {
    expect(GLITCH_BRIGHT_CAP).toBeLessThan(0.25)
    for (const mode of [1, 2] as const)
      for (const t of samples)
        expect(brightShare(glitchShape(mode, t))).toBeLessThanOrEqual(GLITCH_BRIGHT_CAP)
  })

  it('has exactly GLITCH_STEPS frames per phase', () => {
    const seen = new Set(samples.map((t) => glitchShape(1, t).step))
    expect(seen.size).toBe(GLITCH_STEPS)
  })

  it('reuses the object it is given', () => {
    const out = glitchShape(1, 0)
    expect(glitchShape(1, 0.5, out)).toBe(out)
  })
})
