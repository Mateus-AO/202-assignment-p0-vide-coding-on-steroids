import { describe, expect, it } from 'vitest'
import { tierFor } from './quality'

describe('tierFor', () => {
  it('gives phones the low tier', () => {
    expect(tierFor({ coarsePointer: true, cores: 8 })).toBe('low')
  })
  it('gives weak machines the low tier', () => {
    expect(tierFor({ coarsePointer: false, cores: 4 })).toBe('low')
  })
  it('gives capable desktops the high tier', () => {
    expect(tierFor({ coarsePointer: false, cores: 8 })).toBe('high')
  })
})
