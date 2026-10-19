import { describe, expect, it } from 'vitest'
import { HALF_D, HALF_W } from './arena'
import { beats } from './beats'
import { cellScale, GLYPH_CELLS, glyphProgress, GRID } from './glyph'

describe('the merge ring', () => {
  it('has no tile twice and keeps every tile on the floor, off the walls', () => {
    const ids = GLYPH_CELLS.map((c) => `${c.col},${c.row}`)
    expect(new Set(ids).size).toBe(ids.length)
    expect(GLYPH_CELLS.length).toBeGreaterThan(50)
    for (const c of GLYPH_CELLS) {
      expect(c.col).toBeGreaterThanOrEqual(0)
      expect(c.col).toBeLessThan(GRID.cols)
      expect(c.row).toBeGreaterThanOrEqual(0)
      expect(c.row).toBeLessThan(GRID.rows)
      expect(Math.abs(c.x)).toBeLessThanOrEqual(HALF_W - 0.5)
      expect(Math.abs(c.z)).toBeLessThanOrEqual(HALF_D - 0.5)
    }
  })

  it('is drawn along its line: keys rise from the first node to the second', () => {
    const keys = GLYPH_CELLS.map((c) => c.key)
    expect(Math.min(...keys)).toBe(0)
    expect(Math.max(...keys)).toBeCloseTo(1, 6)
    expect([...keys].sort((a, b) => a - b)).toEqual(keys)
  })

  it('is empty before the merge, complete well before the title, and scrubs both ways', () => {
    expect(glyphProgress(beats.ranges.merge[0])).toBe(0)
    expect(glyphProgress(beats.ranges.title[0])).toBe(1)
    expect(glyphProgress(0.6)).toBeGreaterThan(0)
    expect(glyphProgress(0.6)).toBeLessThan(glyphProgress(0.7))
    for (const c of GLYPH_CELLS) {
      expect(cellScale(c.key, 0)).toBe(0)
      expect(cellScale(c.key, 1)).toBe(1)
    }
  })

  it('has two node rings with open middles and a closed line with an arrowhead', () => {
    const has = (col: number, row: number) =>
      GLYPH_CELLS.some((c) => c.col === col && c.row === row)
    for (const col of [2, 14]) {
      expect(has(col, 9), 'node center is open').toBe(false)
      expect(has(col, 7) && has(col, 11) && has(col - 2, 9) && has(col + 2, 9)).toBe(true)
    }
    for (let c = 2; c <= 14; c++) expect(has(c, 1), `top bar @${c}`).toBe(true)
    for (let r = 1; r <= 6; r++) expect(has(2, r), `left line @${r}`).toBe(true)
    // The arrowhead is wider than the shaft above it and ends on the node.
    expect(has(12, 4) && has(16, 4) && has(14, 6)).toBe(true)
  })
})
