import { describe, expect, it } from 'vitest'
import type { Caption } from './caption'
import {
  captionFields,
  fieldProgresses,
  MAX_REVEAL_SHARE,
  NOISE_WIDTH,
  revealProgress,
  scramble,
  statProgress,
  statValue,
} from './reveal'

const TEXT = 'Every game is rules plus assets, 1972.'
const whole = (r: ReturnType<typeof scramble>) => r.done + r.noise + r.cursor + r.rest

describe('scramble', () => {
  it('shows nothing, and no cursor, before it starts', () => {
    expect(scramble(TEXT, -1, 1)).toEqual({ done: '', noise: '', cursor: '', rest: TEXT })
  })
  it('puts the cursor on the first character at progress 0', () => {
    const r = scramble(TEXT, 0, 1)
    expect(r.done + r.noise).toBe('')
    expect(r.cursor).toBe('E')
    expect(r.rest).toBe(TEXT.slice(1))
  })
  it('ends as exactly the text, with no cursor', () => {
    expect(scramble(TEXT, 1, 1)).toEqual({ done: TEXT, noise: '', cursor: '', rest: '' })
    expect(scramble(TEXT, 3, 1).done).toBe(TEXT)
  })
  it('always keeps the length, so the box never changes size', () => {
    for (let p = 0; p <= 1; p += 0.013) {
      const r = scramble(TEXT, p, 7)
      expect(whole(r).length).toBe(TEXT.length)
      // The part that is not final is at most NOISE_WIDTH characters.
      expect(r.noise.length).toBeLessThanOrEqual(NOISE_WIDTH)
    }
  })
  it('never moves a space or punctuation, so lines wrap as in the final text', () => {
    for (let p = 0; p < 1; p += 0.017) {
      const r = scramble(TEXT, p, 3)
      const shown = r.done + r.noise
      for (let i = 0; i < shown.length; i++) {
        if (!/[0-9A-Za-z]/.test(TEXT[i])) expect(shown[i]).toBe(TEXT[i])
      }
    }
  })
  it('is a pure function of progress: the same input gives the same output, both ways', () => {
    const forward = [0.2, 0.5, 0.8].map((p) => scramble(TEXT, p, 5))
    const backward = [0.8, 0.5, 0.2].map((p) => scramble(TEXT, p, 5)).reverse()
    expect(backward).toEqual(forward)
  })
  it('resolves only letters before the head, left to right', () => {
    const early = scramble(TEXT, 0.3, 2)
    const late = scramble(TEXT, 0.7, 2)
    expect(early.done.length).toBeLessThan(late.done.length)
    expect(TEXT.startsWith(early.done)).toBe(true)
    expect(TEXT.startsWith(late.done)).toBe(true)
  })
  it('differs with the seed', () => {
    expect(scramble(TEXT, 0.5, 1).noise).not.toBe(scramble(TEXT, 0.5, 2).noise)
  })
})

describe('statValue', () => {
  it('counts a leading number up and ends on the exact value', () => {
    expect(statValue('60 blocks', 1, 0)).toBe('60 blocks')
    expect(statValue('60 blocks', 0.5, 0)).toBe('45 blocks')
    expect(statValue('60 blocks', 0.2, 0)).toMatch(/^\d+ blocks$/)
    const a = Number.parseInt(statValue('2011', 0.3, 0))
    const b = Number.parseInt(statValue('2011', 0.6, 0))
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(2011)
  })
  it('keeps decimals while counting', () => {
    expect(statValue('5.2 blocks', 0.5, 0)).toBe('3.9 blocks')
    expect(statValue('5.2 blocks', 1, 0)).toBe('5.2 blocks')
  })
  it('scrambles a value that is not a number, and shows nothing at 0', () => {
    expect(statValue('flag, castle', 0, 0)).toBe('')
    const mid = statValue('flag, castle', 0.5, 4)
    expect(mid.length).toBeGreaterThan(0)
    expect(mid.length).toBeLessThan('flag, castle'.length + 1)
    expect(statValue('flag, castle', 1, 4)).toBe('flag, castle')
  })
})

describe('statProgress', () => {
  it('starts the stats one after another and finishes them all at 1', () => {
    expect(statProgress(0.25, 0, 4)).toBeGreaterThan(0)
    expect(statProgress(0.25, 3, 4)).toBe(0)
    for (let i = 0; i < 4; i++) expect(statProgress(1, i, 4)).toBe(1)
    expect(statProgress(0.5, 0, 1)).toBeGreaterThan(0)
  })
})

describe('fieldProgresses', () => {
  const caption: Caption = {
    from: 0,
    to: 1,
    kicker: 'AAAA',
    body: 'BBBBBBBB',
    footnote: 'CCCC',
  }
  const fields = captionFields(caption)
  const at = (p: number) => {
    const out = new Float64Array(fields.length)
    fieldProgresses(fields, p, out)
    return Array.from(out)
  }
  it('lists the fields in writing order', () => {
    expect(fields.map((f) => f.key)).toEqual(['kicker', 'body', 'footnote'])
  })
  it('writes one field at a time', () => {
    expect(at(0)).toEqual([0, -1, -1])
    const mid = at(0.5)
    expect(mid[0]).toBe(1)
    expect(mid[1]).toBeGreaterThan(0)
    expect(mid[1]).toBeLessThan(1)
    expect(mid[2]).toBe(-1)
    expect(at(1)).toEqual([1, 1, 1])
  })
})

describe('revealProgress', () => {
  const c: Caption = { from: 0.2, to: 0.6, body: 'x'.repeat(300) }
  it('is 0 before the range and 1 once written, never past', () => {
    expect(revealProgress(c, 0)).toBe(0)
    expect(revealProgress(c, 0.2)).toBe(0)
    expect(revealProgress(c, 0.6)).toBe(1)
    expect(revealProgress(c, 1)).toBe(1)
  })
  it('leaves reading time: it finishes within MAX_REVEAL_SHARE of the range', () => {
    expect(revealProgress(c, 0.2 + 0.4 * MAX_REVEAL_SHARE + 1e-9)).toBe(1)
  })
  it('writes a short text quickly, then keeps it', () => {
    const short: Caption = { from: 0.2, to: 0.6, body: 'Hiss' }
    expect(revealProgress(short, 0.3)).toBe(1)
  })
  it('is monotonic', () => {
    let last = 0
    for (let u = 0; u <= 1; u += 0.01) {
      const p = revealProgress(c, u)
      expect(p).toBeGreaterThanOrEqual(last)
      last = p
    }
  })
  it('shows a settled caption complete from the start', () => {
    expect(revealProgress({ ...c, settled: true }, 0.2)).toBe(1)
  })
})
