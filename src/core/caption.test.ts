import { describe, expect, it } from 'vitest'
import { captionLabel, captionProblem, MAX_CAPTION_STATS } from './caption'

describe('captionProblem', () => {
  it('accepts a caption with only a body', () => {
    expect(captionProblem({ from: 0, to: 0.5, body: 'hi' })).toBeUndefined()
  })
  it('rejects a bad range', () => {
    expect(captionProblem({ from: 0.5, to: 0.5, body: 'hi' })).toBe('bad caption range')
    expect(captionProblem({ from: 0, to: 1.1, body: 'hi' })).toBe('bad caption range')
  })
  it('rejects an empty caption', () => {
    expect(captionProblem({ from: 0, to: 1 })).toBe('caption has no content')
  })
  it('rejects too many stats and half-empty stats', () => {
    const stat = { label: 'a', value: 'b' }
    expect(
      captionProblem({ from: 0, to: 1, stats: Array(MAX_CAPTION_STATS + 1).fill(stat) }),
    ).toMatch(/stats/)
    expect(
      captionProblem({ from: 0, to: 1, stats: [{ label: 'a', value: '' }] }),
    ).toMatch(/stat/)
  })
})

describe('captionLabel', () => {
  it('prefers the headline and falls back to the range', () => {
    expect(captionLabel({ from: 0, to: 1, headline: 'H', body: 'B' })).toBe('H')
    expect(
      captionLabel({ from: 0.1, to: 0.2, stats: [{ label: 'a', value: 'b' }] }),
    ).toBe('0.1-0.2')
  })
})
