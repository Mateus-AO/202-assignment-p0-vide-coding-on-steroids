import { describe, expect, it } from 'vitest'
import { fieldProgresses, scramble } from '@/core/reveal'
import {
  MERGE_PART,
  SUBTITLE_TEXT,
  TITLE_FIELDS,
  TITLE_PARTS,
  TITLE_TEXT,
  cutParts,
  titleReveal,
} from './copy'

describe('title copy', () => {
  it('reads "You can merge anything" with "merge" as its own part', () => {
    expect(TITLE_TEXT).toBe('You can merge anything')
    expect(TITLE_PARTS[MERGE_PART]).toBe('merge')
  })

  it('subtitle only repeats claims already on the page', () => {
    for (const claim of ['MCP server', 'CLI', 'AI agents', 'old binaries', 'locally']) {
      expect(SUBTITLE_TEXT).toContain(claim)
    }
  })
})

describe('titleReveal', () => {
  const [from, to] = [0.78, 1]
  it('is hidden before the beat, writes over its first 60%, then stays', () => {
    expect(titleReveal(0.5, from, to)).toBe(-1)
    expect(titleReveal(0.7799, from, to)).toBe(-1)
    expect(titleReveal(from, from, to)).toBe(0)
    const end = from + (to - from) * 0.6
    expect(titleReveal(end, from, to)).toBe(1)
    expect(titleReveal(1, from, to)).toBe(1)
    const mid = titleReveal((from + end) / 2, from, to)
    expect(mid).toBeGreaterThan(0.4)
    expect(mid).toBeLessThan(0.6)
  })
  it('scrubs back', () => {
    expect(titleReveal(0.95, from, to)).toBe(1)
    expect(titleReveal(0.8, from, to)).toBeLessThan(0.3)
    expect(titleReveal(0.7, from, to)).toBe(-1)
  })
})

describe('cutParts', () => {
  const visible = ['', '', '']
  const hidden = ['', '', '']
  it('joins back to the title at every count', () => {
    for (let shown = 0; shown <= TITLE_TEXT.length; shown++) {
      cutParts(TITLE_TEXT, shown, visible, hidden)
      expect(visible.join('') + hidden.join('')).toHaveLength(TITLE_TEXT.length)
      expect(visible.join('')).toBe(TITLE_TEXT.slice(0, shown))
      expect(TITLE_TEXT.startsWith(visible.join(''))).toBe(true)
    }
  })
  it('keeps each part in its own slot', () => {
    cutParts(TITLE_TEXT, 10, visible, hidden)
    expect(visible).toEqual(['You can ', 'me', ''])
    expect(hidden).toEqual(['', 'rge', ' anything'])
  })
})

describe('field order', () => {
  it('writes the title before the subtitle', () => {
    const out = new Float64Array(2)
    fieldProgresses(TITLE_FIELDS, 0.05, out)
    expect(out[0]).toBeGreaterThan(0)
    expect(out[1]).toBe(-1)
    fieldProgresses(TITLE_FIELDS, 1, out)
    expect([out[0], out[1]]).toEqual([1, 1])
  })
  it('scrambles the title to its final text', () => {
    const r = scramble(TITLE_TEXT, 1, 3)
    expect(r.done).toBe(TITLE_TEXT)
  })
})
