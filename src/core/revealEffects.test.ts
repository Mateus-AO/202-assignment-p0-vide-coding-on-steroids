import { describe, expect, it } from 'vitest'
import {
  FADE_STEPS,
  fadeAlpha,
  revealText,
  revealedText,
  scramble,
  statValue,
  typewriter,
} from './reveal'

const TEXT = 'Rules plus assets, 1972!'

describe('typewriter', () => {
  it('shows nothing before it starts, and everything at the end', () => {
    expect(typewriter(TEXT, -1)).toEqual({ done: '', noise: '', cursor: '', rest: TEXT })
    expect(typewriter(TEXT, 1)).toEqual({ done: TEXT, noise: '', cursor: '', rest: '' })
  })

  it('writes left to right with no scrambled characters', () => {
    for (let p = 0; p < 1; p += 0.037) {
      const r = typewriter(TEXT, p)
      expect(r.noise).toBe('')
      expect(r.done + r.cursor + r.rest).toBe(TEXT)
      expect(TEXT.startsWith(r.done)).toBe(true)
    }
  })

  it('only ever adds characters as progress grows (it scrubs both ways)', () => {
    let last = 0
    for (let p = 0; p <= 1; p += 0.01) {
      const n = typewriter(TEXT, p).done.length
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
    expect(typewriter(TEXT, 0.5).done).toBe(typewriter(TEXT, 0.5).done)
  })

  it('keeps the text length so the box does not resize', () => {
    for (let p = 0; p <= 1; p += 0.05) {
      const r = typewriter(TEXT, p)
      expect((r.done + r.cursor + r.rest).length).toBe(TEXT.length)
    }
  })
})

describe('revealText', () => {
  it('picks the effect: scramble resolves through noise, typewriter does not', () => {
    expect(revealText('scramble', TEXT, 0.4, 7)).toEqual(scramble(TEXT, 0.4, 7))
    expect(revealText('typewriter', TEXT, 0.4, 7)).toEqual(typewriter(TEXT, 0.4))
  })

  it('shows a fade line whole once reached, nothing before', () => {
    expect(revealText('fade', TEXT, -1, 0).done).toBe('')
    expect(revealText('fade', TEXT, 0, 0)).toEqual({
      done: TEXT,
      noise: '',
      cursor: '',
      rest: '',
    })
  })

  it('ends every effect on exactly the text', () => {
    for (const e of ['scramble', 'typewriter', 'fade'] as const) {
      expect(revealedText(e, TEXT, 1, 3)).toBe(TEXT)
    }
  })
})

describe('fadeAlpha', () => {
  it('is 0 before, 1 after, and steps up in between', () => {
    expect(fadeAlpha(-1)).toBe(0)
    expect(fadeAlpha(1)).toBe(1)
    expect(fadeAlpha(0.999)).toBeLessThan(1)
    const seen = new Set<number>()
    let last = 0
    for (let p = 0; p <= 1; p += 0.005) {
      const a = fadeAlpha(p)
      expect(a).toBeGreaterThanOrEqual(last)
      last = a
      seen.add(a)
    }
    seen.add(fadeAlpha(1))
    expect(seen.size).toBe(FADE_STEPS + 1)
  })
})

describe('statValue by effect', () => {
  it('counts numbers up in every effect except fade, which shows the value whole', () => {
    expect(statValue('60 blocks', 0.5, 1, 'typewriter')).toMatch(/^\d+ blocks$/)
    expect(statValue('60 blocks', 0.5, 1, 'fade')).toBe('60 blocks')
  })

  it('types a non-numeric value left to right in typewriter, without noise', () => {
    const v = 'logic chips'
    const half = statValue(v, 0.5, 1, 'typewriter')
    expect(v.startsWith(half)).toBe(true)
    expect(half.length).toBeGreaterThan(0)
    expect(half.length).toBeLessThan(v.length)
  })

  it('is empty before it starts and exact at the end, in every effect', () => {
    for (const e of ['scramble', 'typewriter', 'fade'] as const) {
      expect(statValue('~66', 0, 1, e)).toBe('')
      expect(statValue('~66', 1, 1, e)).toBe('~66')
    }
  })
})
