import { describe, expect, it } from 'vitest'
import { frameAt, progressPast } from './timeline'
import type { WorldModule } from './world'

const world = (id: string, scrollWeight?: number): WorldModule => ({
  id,
  Scene: () => null,
  cameraPath: () => ({ position: [0, 0, 1], target: [0, 0, 0] }),
  captions: [],
  scrollWeight,
})

describe('progressPast', () => {
  const worlds = [world('short', 0.05), world('b'), world('c'), world('d')]

  it('is the boundary of the next world', () => {
    const p = progressPast(worlds, 0)
    expect(frameAt(worlds, p).index).toBe(1)
  })

  it('still leaves a world shorter than one reduced-motion step', () => {
    const p = progressPast(worlds, 0, { reduced: true })
    expect(frameAt(worlds, p, { reduced: true }).index).toBe(1)
    expect(p).toBeLessThan(0.25)
    // Without the adjustment the snapped frame stays behind.
    expect(frameAt(worlds, 0.05 / 3.05, { reduced: true }).index).toBe(0)
  })

  it('never goes past the end', () => {
    expect(progressPast(worlds, 3, { reduced: true })).toBe(1)
  })
})
