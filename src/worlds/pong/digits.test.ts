import { describe, expect, it } from 'vitest'
import { DIGIT_CELLS, digitCell } from './digits'

describe('digits', () => {
  it('lights a sensible number of cells for each digit', () => {
    for (let d = 0; d <= 9; d++) {
      const lit = Array.from({ length: DIGIT_CELLS }, (_, i) => digitCell(d, i)).filter(
        Boolean,
      )
      expect(lit.length).toBeGreaterThanOrEqual(5)
      expect(lit.length).toBeLessThanOrEqual(13)
    }
  })
  it('draws 8 with every row lit at the edges and clamps big numbers to 9', () => {
    expect(digitCell(8, 0)).toBe(true)
    expect(digitCell(12, 0)).toBe(digitCell(9, 0))
    expect(digitCell(1, 0)).toBe(false)
  })
})
