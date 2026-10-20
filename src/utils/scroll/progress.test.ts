import { describe, expect, it } from 'vitest'
import { progressAtScroll, scrollEnd, scrollForProgress } from './progress'

describe('scroll end', () => {
  it('is the content bottom minus one viewport', () => {
    expect(scrollEnd(9000, 800)).toBe(8200)
  })
  it('is 0 when the content fits in the viewport', () => {
    expect(scrollEnd(500, 800)).toBe(0)
  })
})

describe('progress at a scroll offset', () => {
  // A 9000 px spacer in an 800 px viewport, then a 1200 px footer: the page is 10200 px tall.
  const end = scrollEnd(9000, 800)
  const pageMax = 10200 - 800

  it('runs 0 to 1 over the spacer only', () => {
    expect(progressAtScroll(0, end)).toBe(0)
    expect(progressAtScroll(end / 2, end)).toBeCloseTo(0.5)
    expect(progressAtScroll(end, end)).toBe(1)
  })

  it('stays at 1 while the footer scrolls into view, up to the very bottom', () => {
    for (let y = end; y <= pageMax; y += 100) expect(progressAtScroll(y, end)).toBe(1)
    expect(progressAtScroll(pageMax, end)).toBe(1)
  })

  it('clamps overscroll above the top and a degenerate page', () => {
    expect(progressAtScroll(-50, end)).toBe(0)
    expect(progressAtScroll(100, 0)).toBe(0)
  })
})

describe('scroll offset for a progress', () => {
  it('maps onto the spacer, not the whole page', () => {
    expect(scrollForProgress(1, 8200)).toBe(8200)
    expect(scrollForProgress(0.25, 8200)).toBe(2050)
    expect(scrollForProgress(2, 8200)).toBe(8200)
    expect(scrollForProgress(-1, 8200)).toBe(0)
  })
  it('round-trips with progressAtScroll', () => {
    for (const p of [0, 0.1, 0.37, 0.9, 1]) {
      expect(progressAtScroll(scrollForProgress(p, 8200), 8200)).toBeCloseTo(p)
    }
  })
})
