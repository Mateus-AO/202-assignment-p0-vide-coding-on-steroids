import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import {
  assembleAmount,
  PIC_H,
  PIC_W,
  POSE_LIMITS,
  POSES,
  ROW_SIZES,
  SLOTS,
  STRAIGHTEN_TO,
  tiltAt,
  TV_COUNT,
  warmAmount,
  WAVE_RANK,
} from './layout'

describe('the pile', () => {
  it('is nine sets in a trapezoid: 4 on the bottom, 3 above, 2 on top', () => {
    expect(TV_COUNT).toBe(9)
    expect(ROW_SIZES).toEqual([4, 3, 2])
    expect(SLOTS.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    for (const row of [0, 1, 2]) {
      expect(SLOTS.filter((s) => s.row === row)).toHaveLength(ROW_SIZES[row])
    }
  })

  it('narrows toward the top and is centered', () => {
    const width = (row: number) => {
      const xs = SLOTS.filter((s) => s.row === row).map((s) => s.x)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(width(0)).toBeGreaterThan(width(1))
    expect(width(1)).toBeGreaterThan(width(2))
    for (const row of [0, 1, 2]) {
      const xs = SLOTS.filter((s) => s.row === row).map((s) => s.x)
      expect(Math.max(...xs) + Math.min(...xs)).toBeCloseTo(0)
    }
  })

  it('gives every set a slice of the picture, inside the grid and not overlapping', () => {
    for (const { rect } of SLOTS) {
      expect(rect.x0).toBeGreaterThanOrEqual(-1e-9)
      expect(rect.y0).toBeGreaterThanOrEqual(-1e-9)
      expect(rect.x1).toBeLessThanOrEqual(PIC_W + 1e-9)
      expect(rect.y1).toBeLessThanOrEqual(PIC_H + 1e-9)
      expect(rect.x1).toBeGreaterThan(rect.x0)
      expect(rect.y1).toBeGreaterThan(rect.y0)
    }
    for (const a of SLOTS)
      for (const b of SLOTS) {
        if (a.index >= b.index) continue
        const overlapX = Math.min(a.rect.x1, b.rect.x1) - Math.max(a.rect.x0, b.rect.x0)
        const overlapY = Math.min(a.rect.y1, b.rect.y1) - Math.max(a.rect.y0, b.rect.y0)
        expect(overlapX > 1e-9 && overlapY > 1e-9).toBe(false)
      }
  })

  it('has a picture grid with square-ish pixels', () => {
    const { rect } = SLOTS[0]
    const slicePixelAspect = (rect.x1 - rect.x0) / (rect.y1 - rect.y0)
    expect(slicePixelAspect).toBeCloseTo(4 / 3, 1)
  })
})

describe('the hand-stacked poses', () => {
  it('stay inside their limits and are not all the same', () => {
    for (const p of POSES) {
      expect(Math.abs(p.yaw)).toBeLessThanOrEqual(POSE_LIMITS.yaw)
      expect(Math.abs(p.roll)).toBeLessThanOrEqual(POSE_LIMITS.roll)
      expect(Math.abs(p.scale - 1)).toBeLessThanOrEqual(POSE_LIMITS.scale)
      expect(Math.abs(p.dz)).toBeLessThanOrEqual(POSE_LIMITS.dz)
    }
    expect(new Set(POSES.map((p) => p.yaw)).size).toBe(POSES.length)
  })

  it('straighten to 40% of their tilt while the picture assembles, and no further', () => {
    const out = { yaw: 0, roll: 0 }
    for (const i of [0, 4, 8]) {
      tiltAt(i, beats.ranges.assemble[0], out)
      expect(out.yaw).toBeCloseTo(POSES[i].yaw)
      tiltAt(i, beats.ranges.assemble[1], out)
      expect(out.yaw).toBeCloseTo(POSES[i].yaw * STRAIGHTEN_TO)
      expect(out.roll).toBeCloseTo(POSES[i].roll * STRAIGHTEN_TO)
      tiltAt(i, 1, out)
      expect(out.yaw).toBeCloseTo(POSES[i].yaw * STRAIGHTEN_TO)
    }
  })
})

describe('the waves', () => {
  it('run from the middle of the pile outward', () => {
    expect(Math.min(...WAVE_RANK)).toBeCloseTo(0)
    expect(Math.max(...WAVE_RANK)).toBeCloseTo(1)
    const center = SLOTS.find((s) => s.row === 1 && s.col === 1)!
    expect(WAVE_RANK[center.index]).toBe(0)
  })

  it('warm every set up from off to fully on inside the warm beat, center first', () => {
    const [from, to] = beats.ranges.warm
    for (const s of SLOTS) {
      expect(warmAmount(s.index, from)).toBe(0)
      expect(warmAmount(s.index, to)).toBe(1)
    }
    const mid = (from + to) / 2
    const first = SLOTS.find((s) => WAVE_RANK[s.index] === 0)!.index
    const last = WAVE_RANK.indexOf(1)
    expect(warmAmount(first, mid)).toBeGreaterThan(warmAmount(last, mid))
  })

  it('scramble, then lock, each set inside the assemble beat, center first', () => {
    const [from, to] = beats.ranges.assemble
    const out = { scramble: 0, lock: 0 }
    for (const s of SLOTS) {
      assembleAmount(s.index, from, out)
      expect(out).toEqual({ scramble: 0, lock: 0 })
      assembleAmount(s.index, to, out)
      expect(out).toEqual({ scramble: 1, lock: 1 })
      for (let u = from; u <= to; u += 0.005) {
        assembleAmount(s.index, u, out)
        expect(out.lock).toBeLessThanOrEqual(out.scramble + 1e-9)
      }
    }
  })

  it('are scrubbable: the same progress always gives the same amounts', () => {
    expect(warmAmount(3, 0.17)).toBe(warmAmount(3, 0.17))
  })
})
