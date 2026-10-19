import { describe, expect, it } from 'vitest'
import { CRT_BARS_END, CRT_DOT_BAND, CRT_LINE_BAND, CRT_LINE_END, crtShape } from './crt'

const samples = Array.from({ length: 201 }, (_, i) => i / 200)

describe('crtShape', () => {
  it('covers nothing at the start', () => {
    const s = crtShape(0)
    expect(s.band).toBe(1)
    expect(s.reach).toBe(1)
    expect(s.light).toBe(0)
    expect(s.glow).toBe(0)
    expect(s.fade).toBe(1)
  })

  it('is a thin full-width line when the bars have closed', () => {
    const s = crtShape(CRT_BARS_END)
    expect(s.band).toBeCloseTo(CRT_LINE_BAND, 6)
    expect(s.band).toBeLessThan(0.02)
    expect(s.reach).toBe(1)
    expect(s.light).toBe(1)
    expect(s.fade).toBe(1)
  })

  it('is a dot when the line has shrunk', () => {
    const s = crtShape(CRT_LINE_END)
    expect(s.reach).toBe(0)
    expect(s.band).toBeCloseTo(CRT_DOT_BAND, 6)
    expect(s.fade).toBe(1)
  })

  it('is fully dark at the end', () => {
    const s = crtShape(1)
    expect(s.fade).toBe(0)
    expect(s.glow).toBe(0)
  })

  it('moves one way only: no strobing', () => {
    let prev = crtShape(0)
    for (const t of samples.slice(1)) {
      const s = crtShape(t)
      // The bars only close; afterwards the line swells slightly into a dot.
      if (t <= CRT_BARS_END) expect(s.band).toBeLessThanOrEqual(prev.band + 1e-9)
      else expect(s.band).toBeGreaterThanOrEqual(prev.band - 1e-9)
      expect(s.reach).toBeLessThanOrEqual(prev.reach + 1e-9)
      expect(s.fade).toBeLessThanOrEqual(prev.fade + 1e-9)
      expect(s.light).toBeGreaterThanOrEqual(prev.light - 1e-9)
      // Glow rises through the bars and line, then only falls with the dot.
      if (t <= CRT_LINE_END) expect(s.glow).toBeGreaterThanOrEqual(prev.glow - 1e-9)
      else expect(s.glow).toBeLessThanOrEqual(prev.glow + 1e-9)
      prev = s
    }
  })

  it('keeps every value in range and is pure', () => {
    for (const t of [-1, ...samples, 2]) {
      const s = crtShape(t)
      expect(s).toEqual(crtShape(t))
      for (const v of Object.values(s)) {
        expect(Number.isFinite(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('splits the window roughly 45 / 35 / 20', () => {
    expect(CRT_BARS_END).toBeCloseTo(0.45)
    expect(CRT_LINE_END - CRT_BARS_END).toBeCloseTo(0.35)
    expect(1 - CRT_LINE_END).toBeCloseTo(0.2)
  })
})
