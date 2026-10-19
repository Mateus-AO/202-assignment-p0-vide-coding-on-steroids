import { describe, expect, it } from 'vitest'
import { createPicker, pickCrossed, pickedCount, resetPicker } from './crossing'

const items = [0, 0.2, 0.4, 0.6, 0.8].map((at) => ({ at }))
const picked = (from: number, to: number, max = 10) => {
  const p = createPicker<{ at: number }>(max)
  pickCrossed(items, from, to, p)
  return p.items.slice(0, pickedCount(p)).map((i) => i.at)
}

describe('pickCrossed', () => {
  it('picks items crossed moving forward: from < at <= to', () => {
    expect(picked(0.1, 0.4)).toEqual([0.2, 0.4])
    expect(picked(0.2, 0.39)).toEqual([])
    expect(picked(-1, 0)).toEqual([0])
  })

  it('is silent moving backward or standing still', () => {
    expect(picked(0.9, 0.1)).toEqual([])
    expect(picked(0.4, 0.4)).toEqual([])
  })

  it('keeps only the latest `max` on a big jump', () => {
    expect(picked(0, 1, 2).sort()).toEqual([0.6, 0.8])
  })

  it('skips items the predicate rejects', () => {
    const p = createPicker<{ at: number }>(10)
    pickCrossed(items, 0, 1, p, (i) => i.at === 0.4)
    expect(p.items.slice(0, pickedCount(p)).map((i) => i.at)).toEqual([0.2, 0.6, 0.8])
  })

  it('accumulates across calls until reset, reusing the same array', () => {
    const p = createPicker<{ at: number }>(10)
    const array = p.items
    pickCrossed(items, 0, 0.2, p)
    pickCrossed(items, 0.5, 0.6, p)
    expect(pickedCount(p)).toBe(2)
    resetPicker(p)
    expect(pickedCount(p)).toBe(0)
    expect(p.items).toBe(array)
  })
})
