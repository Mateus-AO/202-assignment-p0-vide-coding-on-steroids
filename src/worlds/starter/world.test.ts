import { describe, expect, it } from 'vitest'
import { frameAt } from '@/core/timeline'
import { captionProblem } from '@/core/caption'
import { beats, BUTTON_UNTIL, CAPTION_END, OPEN_AT } from './beats'
import {
  glassRect,
  HALF_FOV_TAN,
  HOLE_H,
  HOLE_W,
  PLATE_Z,
  starterCamera,
  startDistance,
  windowRect,
} from './camera'
import { captions } from './captions'
import { BUTTON_Y, playButtonSpot } from './layout'
import { starter } from './world'

/** Phones in portrait up to an ultra-wide desktop. */
const ASPECTS = [0.42, 0.46, 0.5, 0.56, 0.75, 1, 1.78, 2.4]

describe('starter camera', () => {
  it.each(ASPECTS)('fits the window in view at the start, at aspect %f', (aspect) => {
    const { position } = starterCamera(0, aspect)
    const half = (position[2] - PLATE_Z) * HALF_FOV_TAN
    // Window edges in normalized device coordinates.
    expect(Math.abs((HOLE_H / 2 - position[1]) / half)).toBeLessThan(1)
    expect(Math.abs((-HOLE_H / 2 - position[1]) / half)).toBeLessThan(1)
    expect(HOLE_W / 2 / (half * aspect)).toBeLessThan(1)
    const r = windowRect(aspect)
    expect(r.left).toBeGreaterThan(0)
    expect(r.left + r.width).toBeLessThan(1)
    expect(r.top).toBeGreaterThan(0)
    expect(r.top + r.height).toBeLessThan(1)
  })

  it.each(ASPECTS)(
    'ends exactly on the portal plane, looking down -z, at %f',
    (aspect) => {
      const end = starterCamera(1, aspect)
      expect(end.position[0]).toBeCloseTo(0)
      expect(end.position[1]).toBeCloseTo(0)
      expect(end.position[2]).toBeCloseTo(0)
      expect(end.target[2] - end.position[2]).toBeCloseTo(-1)
      expect(end.target[0]).toBe(end.position[0])
      expect(end.target[1]).toBe(end.position[1])
    },
  )

  it('pulls back as the screen gets narrower', () => {
    expect(startDistance(0.46)).toBeGreaterThan(startDistance(1.78))
  })

  it('flies steadily closer', () => {
    let last = Infinity
    for (let u = 0; u <= 1; u += 0.05) {
      const z = starterCamera(u, 1.78).position[2]
      expect(z).toBeLessThanOrEqual(last + 1e-9)
      last = z
    }
  })

  it('sits still until the flight starts', () => {
    expect(starterCamera(0, 1.78)).toEqual(starterCamera(beats.ranges.flight[0], 1.78))
  })
})

describe('play button', () => {
  it.each(ASPECTS)('lies inside the window below the bar at aspect %f', (aspect) => {
    const w = windowRect(aspect)
    const spot = playButtonSpot(aspect)
    expect(spot.left).toBeCloseTo(0.5)
    expect(spot.top).toBeGreaterThan(w.top + w.height * 0.5)
    expect(spot.top).toBeLessThan(w.top + w.height)
    const g = glassRect(aspect)
    expect(spot.top).toBeCloseTo(g.top + g.height * BUTTON_Y)
  })

  it.each([0.46, 0.56])(
    'leaves room for a 48 px button on a phone (aspect %f)',
    (aspect) => {
      const height = 844
      const w = windowRect(aspect)
      const spot = playButtonSpot(aspect)
      const bottom = (spot.top + 24 / height) * 1
      expect(bottom).toBeLessThan(w.top + w.height)
    },
  )
})

describe('starter world', () => {
  it('has a short scroll and a portal that opens after the picture has gone dark', () => {
    expect(starter.scrollWeight).toBeLessThan(1)
    expect(starter.exit).toMatchObject({ kind: 'portal', openAt: OPEN_AT })
    expect(OPEN_AT).toBe(beats.ranges.tune[1])
    expect(beats.ranges.blend[0]).toBeGreaterThan(OPEN_AT)
  })

  it('shows its title while the screen waits and drops it once the flight has started', () => {
    expect(captions.length).toBeGreaterThan(0)
    for (const c of captions) expect(captionProblem(c)).toBeUndefined()
    expect(BUTTON_UNTIL).toBeLessThan(CAPTION_END)
    expect(captions[0].from).toBe(0)
    expect(captions[0].to).toBe(CAPTION_END)
  })

  it('is the active world at the very start', () => {
    expect(frameAt([starter, { ...starter, id: 'next' }], 0).world.id).toBe('starter')
  })
})
