import { describe, expect, it } from 'vitest'
import { coverFor, overlayOf, type CoverOverlay } from './overlays'
import type { CoverPhase } from './ScreenMosaic'

const overlays: CoverOverlay[] = ['mosaic', 'crt', 'glitch']
const phases: CoverPhase[] = [
  { mode: 1, t: 0.5 },
  { mode: 2, t: 0.2, style: 'black' },
  { mode: 1, t: 0.5, style: 'crt' },
  { mode: 2, t: 0.5, style: 'glitch' },
]

describe('cover overlays', () => {
  it('gives every cover to exactly one overlay', () => {
    for (const phase of phases)
      expect(overlays.filter((o) => coverFor(o, phase) === phase)).toHaveLength(1)
  })

  it('leaves the mosaic with mosaic and black covers, and skips crt and glitch', () => {
    expect(overlayOf({ mode: 1, t: 0.5 })).toBe('mosaic')
    expect(overlayOf({ mode: 1, t: 0.5, style: 'black' })).toBe('mosaic')
    expect(coverFor('mosaic', phases[2])).toEqual({ mode: 0, t: 0 })
    expect(coverFor('mosaic', phases[3])).toEqual({ mode: 0, t: 0 })
  })

  it('hands a glitch cover to the glitch only, with its phase intact', () => {
    expect(coverFor('glitch', phases[3])).toBe(phases[3])
    expect(coverFor('glitch', phases[2])).toEqual({ mode: 0, t: 0 })
    expect(coverFor('crt', phases[3])).toEqual({ mode: 0, t: 0 })
  })
})
