import { describe, expect, it } from 'vitest'
import { copyrightLine, FOOTER, stackList } from './footerContent'

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('footer copy', () => {
  const all = strings(FOOTER)

  it('has no empty string and keeps each block short', () => {
    for (const s of all) {
      expect(s.trim()).toBe(s)
      expect(s.length).toBeGreaterThan(0)
    }
    for (const s of [FOOTER.tagline, FOOTER.rea.text, FOOTER.built.text]) {
      expect(s.length).toBeLessThanOrEqual(140)
    }
    for (const s of Object.values(FOOTER.notice)) {
      if (s !== FOOTER.notice.title) expect(s.length).toBeLessThanOrEqual(190)
    }
  })

  it('links only to REA, over https', () => {
    expect(FOOTER.rea.href).toBe('https://github.com/morluto/rea')
    const urls = all.filter((s) => /https?:\/\//.test(s))
    expect(urls).toEqual([FOOTER.rea.href])
  })

  it('credits the whole stack', () => {
    const stack = stackList(FOOTER.built.stack)
    for (const name of [
      'React',
      'Three.js',
      'React Three Fiber',
      'drei',
      'GSAP',
      'Lenis',
      'Tailwind',
      'Zustand',
      'Vite',
      'TypeScript',
    ]) {
      expect(stack).toContain(name)
    }
    expect(FOOTER.built.text).toMatch(/drawn or synthesized in code/)
  })

  it('states the no-affiliation and no-endorsement notices', () => {
    expect(FOOTER.notice.original).toMatch(/original/)
    expect(FOOTER.notice.original).toMatch(/affiliated with or endorses/)
    expect(FOOTER.notice.original).toMatch(/tribute/)
    expect(FOOTER.notice.mascot).toMatch(/Claude Code mascot/)
    expect(FOOTER.notice.mascot).toMatch(/no endorsement by Anthropic/)
  })

  it('hard-codes no year and names no author', () => {
    for (const s of all) expect(s).not.toMatch(/\b(19|20)\d{2}\b/)
    for (const s of all) expect(s).not.toMatch(/mateus|morluto\.com|twitter|linkedin/i)
  })
})

describe('copyright line', () => {
  it('uses the given date', () => {
    expect(copyrightLine(new Date(2031, 5, 1))).toBe('© 2031')
  })
  it('defaults to the current year', () => {
    expect(copyrightLine()).toContain(String(new Date().getFullYear()))
  })
})

describe('stackList', () => {
  it('joins with commas and a final "and"', () => {
    expect(stackList(['A', 'B', 'C'])).toBe('A, B and C')
    expect(stackList(['A', 'B'])).toBe('A and B')
    expect(stackList(['A'])).toBe('A')
    expect(stackList([])).toBe('')
  })
})
