import { describe, expect, it } from 'vitest'
import {
  frameAt,
  REDUCED_STEPS_PER_WORLD,
  scrollBoundary,
  totalScrollWeight,
} from './timeline'
import type { WorldModule } from './world'

const world = (
  id: string,
  exit?: WorldModule['exit'],
  captions: WorldModule['captions'] = [],
): WorldModule => ({
  id,
  Scene: () => null,
  cameraPath: (u) => ({ position: [u, 0, 0], target: [u, 0, -1] }),
  exit,
  captions,
})

const worlds = [
  world(
    'a',
    {
      kind: 'portal',
      position: [1, 0, 0],
      size: [2, 2],
      openAt: 0.5,
      blendRange: [0.6, 0.9],
    },
    [{ from: 0, to: 0.5, body: 'first' }],
  ),
  world('b', { kind: 'cover', whiteFrom: 0.8, whiteFull: 0.9, revealLength: 0.4 }),
  world('c'),
]

describe('frameAt', () => {
  it('splits progress into the active world and local progress', () => {
    const f = frameAt(worlds, 0.5)
    expect(f.index).toBe(1)
    expect(f.u).toBeCloseTo(0.5)
    expect(f.world.id).toBe('b')
  })

  it('moves to the next world exactly at the boundary', () => {
    expect(frameAt(worlds, 1 / 3).index).toBe(1)
    expect(frameAt(worlds, 1 / 3).u).toBeCloseTo(0)
  })

  it('finishes on the last world at u = 1 and clamps out-of-range input', () => {
    expect(frameAt(worlds, 1)).toMatchObject({ index: 2, u: 1 })
    expect(frameAt(worlds, 7)).toMatchObject({ index: 2, u: 1 })
    expect(frameAt(worlds, -1)).toMatchObject({ index: 0, u: 0 })
  })

  it('exposes the camera pose for an aspect ratio', () => {
    expect(frameAt(worlds, 0.1).pose(1.5).position[0]).toBeCloseTo(0.3)
  })

  it('reports the portal only for portal exits, opening then blending', () => {
    expect(frameAt(worlds, 0.1).portal).toEqual({ open: false, blend: 0 })
    const open = frameAt(worlds, 0.55 / 3).portal!
    expect(open).toEqual({ open: true, blend: 0 })
    expect(frameAt(worlds, 0.95 / 3).portal).toEqual({ open: true, blend: 1 })
    expect(frameAt(worlds, 0.5).portal).toBeNull()
  })

  it('picks the caption for the current progress', () => {
    expect(frameAt(worlds, 0.1).caption?.body).toBe('first')
    expect(frameAt(worlds, 0.3).caption).toBeUndefined()
  })

  describe('cover', () => {
    it('is off before the cover starts', () => {
      expect(frameAt(worlds, 1 / 3 + 0.1 / 3).cover).toEqual({ mode: 0, t: 0 })
    })
    it('is fully white at the end of the covering world and at the start of the next', () => {
      expect(frameAt(worlds, 2 / 3 - 1e-9).cover).toMatchObject({ mode: 1 })
      expect(frameAt(worlds, 2 / 3 - 1e-9).cover.t).toBeCloseTo(1)
      expect(frameAt(worlds, 2 / 3).cover).toEqual({ mode: 2, t: 0 })
    })
    it('clears after revealLength', () => {
      expect(frameAt(worlds, 2 / 3 + 0.5 / 3).cover.mode).toBe(0)
    })
    it('carries the black style through both phases, and only when asked for', () => {
      const dark = [
        world('a', {
          kind: 'cover',
          whiteFrom: 0.8,
          whiteFull: 0.9,
          revealLength: 0.4,
          style: 'black',
        }),
        world('b'),
      ]
      expect(frameAt(dark, 0.5 - 1e-9).cover).toMatchObject({ mode: 1, style: 'black' })
      expect(frameAt(dark, 0.5).cover).toEqual({ mode: 2, t: 0, style: 'black' })
      expect(frameAt(worlds, 2 / 3).cover).not.toHaveProperty('style')
    })
    it('carries the crt style through both phases, with a linear phase', () => {
      const tv = [
        world('a', {
          kind: 'cover',
          whiteFrom: 0.8,
          whiteFull: 1,
          revealLength: 0.1,
          style: 'crt',
        }),
        world('b'),
      ]
      expect(frameAt(tv, 0.4 - 1e-9).cover).toEqual({ mode: 0, t: 0 })
      const mid = frameAt(tv, 0.45 - 1e-9).cover
      expect(mid).toMatchObject({ mode: 1, style: 'crt' })
      // Halfway through the window, not the eased 0.5 of a smoothstep (which is also 0.5):
      // check a quarter, where a smoothstep would give 0.156.
      expect(frameAt(tv, 0.425).cover.t).toBeCloseTo(0.25)
      expect(frameAt(tv, 0.5 - 1e-9).cover.t).toBeCloseTo(1)
      expect(frameAt(tv, 0.5).cover).toEqual({ mode: 2, t: 0, style: 'crt' })
    })
    it('carries the glitch style through both phases, with a linear phase', () => {
      const wall = [
        world('a', {
          kind: 'cover',
          whiteFrom: 0.8,
          whiteFull: 1,
          revealLength: 0.1,
          style: 'glitch',
        }),
        world('b'),
      ]
      expect(frameAt(wall, 0.4 - 1e-9).cover).toEqual({ mode: 0, t: 0 })
      expect(frameAt(wall, 0.425).cover).toMatchObject({ mode: 1, style: 'glitch' })
      // A quarter into the window, not a smoothstep's 0.156.
      expect(frameAt(wall, 0.425).cover.t).toBeCloseTo(0.25)
      expect(frameAt(wall, 0.5 - 1e-9).cover.t).toBeCloseTo(1)
      expect(frameAt(wall, 0.5).cover).toEqual({ mode: 2, t: 0, style: 'glitch' })
      expect(frameAt(wall, 0.525).cover).toMatchObject({ mode: 2, style: 'glitch' })
      expect(frameAt(wall, 0.525).cover.t).toBeCloseTo(0.5)
      expect(frameAt(wall, 0.55).cover.mode).toBe(0)
    })
  })

  it('snaps progress in reduced-motion mode', () => {
    const steps = REDUCED_STEPS_PER_WORLD * worlds.length
    const f = frameAt(worlds, 0.43, { reduced: true })
    expect(f.progress * steps).toBeCloseTo(Math.round(f.progress * steps))
    expect(frameAt(worlds, 0.43, { reduced: false }).progress).toBe(0.43)
  })

  describe('scroll weights', () => {
    const long = { ...worlds[1], scrollWeight: 2 }
    const weighted = [worlds[0], long, worlds[2]]

    it('gives a heavier world a longer share of the scroll', () => {
      expect(totalScrollWeight(weighted)).toBe(4)
      expect(scrollBoundary(weighted, 1)).toBeCloseTo(1 / 4)
      expect(scrollBoundary(weighted, 2)).toBeCloseTo(3 / 4)
      expect(scrollBoundary(weighted, 3)).toBe(1)
      expect(frameAt(weighted, 0.24).index).toBe(0)
      expect(frameAt(weighted, 0.25)).toMatchObject({ index: 1, u: 0 })
      expect(frameAt(weighted, 0.5)).toMatchObject({ index: 1 })
      expect(frameAt(weighted, 0.5).u).toBeCloseTo(0.5)
      expect(frameAt(weighted, 0.75)).toMatchObject({ index: 2, u: 0 })
      expect(frameAt(weighted, 1)).toMatchObject({ index: 2, u: 1 })
    })

    it('splits evenly when no world has a weight', () => {
      expect(scrollBoundary(worlds, 1)).toBeCloseTo(1 / 3)
      expect(totalScrollWeight(worlds)).toBe(3)
    })
  })
})
