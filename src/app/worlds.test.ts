import { describe, expect, it } from 'vitest'
import { frameAt } from '@/core/timeline'
import { validateHandoffs } from '@/core/world'
import { worlds } from './worlds'

describe('the real page', () => {
  it('has valid worlds and seamless handoffs', () => {
    expect(() => validateHandoffs(worlds)).not.toThrow()
  })

  it('is continuous across every swap, at any aspect', () => {
    worlds.slice(0, -1).forEach((_, i) => {
      const boundary = (i + 1) / worlds.length
      const before = frameAt(worlds, boundary - 1e-9)
      const after = frameAt(worlds, boundary)
      expect(before.index).toBe(i)
      expect(after.index).toBe(i + 1)
      if (before.world.exit?.kind === 'cover') {
        expect(before.cover).toMatchObject({ mode: 1 })
        expect(before.cover.t).toBeCloseTo(1)
        expect(after.cover).toEqual({ mode: 2, t: 0 })
      } else {
        expect(before.portal?.blend).toBeCloseTo(1)
      }
    })
  })
})
