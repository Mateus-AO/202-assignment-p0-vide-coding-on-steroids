import { describe, expect, it } from 'vitest'
import { captionLabel, captionProblem } from '@/core/caption'
import { captionChars, PROGRESS_PER_CHAR } from '@/core/reveal'
import { worlds } from './worlds'

/** A phone box (about 310 px of text) must stay short; this is the longest copy it can hold. */
const MAX_CHARS = 260
/** Stat labels and values sit in cells about 150 px wide on a phone. */
const MAX_STAT_CHARS = 14

describe.each(worlds.map((w) => [w.id, w] as const))('captions of %s', (_, world) => {
  it('has at least one caption, unless it draws its own words', () => {
    if (world.id !== 'starter') expect(world.captions.length).toBeGreaterThan(0)
  })

  it('are all well-formed', () => {
    for (const c of world.captions) {
      expect(captionProblem(c), captionLabel(c)).toBeUndefined()
    }
  })

  it('are in order and never overlap', () => {
    world.captions.forEach((c, i) => {
      if (i > 0)
        expect(c.from, captionLabel(c)).toBeGreaterThanOrEqual(world.captions[i - 1].to)
    })
  })

  it('have different labels, which the page uses as keys', () => {
    const labels = world.captions.map(captionLabel)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('fit a phone and stay on screen long enough to be written and read', () => {
    for (const c of world.captions) {
      const chars = captionChars(c)
      expect(chars, captionLabel(c)).toBeLessThanOrEqual(MAX_CHARS)
      for (const s of c.stats ?? []) {
        expect(s.label.length, s.label).toBeLessThanOrEqual(MAX_STAT_CHARS)
        expect(s.value.length, s.value).toBeLessThanOrEqual(MAX_STAT_CHARS)
      }
      // Written within 60% of the range, so the text can be read for the rest of it; at the
      // chosen pace unless the range is shorter (checked by `revealProgress` itself).
      if (!c.settled) {
        expect(c.to - c.from, captionLabel(c)).toBeGreaterThanOrEqual(
          Math.min(0.15, (chars * PROGRESS_PER_CHAR) / 0.6),
        )
      }
    }
  })
})

describe('the page', () => {
  it('links REA once, from the voxel world', () => {
    const links = worlds.flatMap((w) =>
      w.captions.filter((c) => c.link).map((c) => [w.id, c.link!.href] as const),
    )
    expect(links).toEqual([['voxel', 'https://github.com/morluto/rea']])
  })
})
