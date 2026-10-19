import { describe, expect, it } from 'vitest'
import { CASTLE_X, DETAIL, END_Z, HERO_HEIGHT, PIPES } from './config'
import { CONTACT_SHADOWS, createScenery, X_MAX, X_MIN } from './scenery'

const count = (s: ReturnType<typeof createScenery>) =>
  Object.values(s).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0)

describe('scenery', () => {
  const high = createScenery('high')
  const low = createScenery('low')

  it('draws less on the low tier, and no far backdrop', () => {
    expect(count(low)).toBeLessThan(count(high))
    expect(DETAIL.low.backdrop).toBe(false)
    expect(low.mountains).toHaveLength(0)
    expect(low.cloudsFar).toHaveLength(0)
    expect(high.mountains.length).toBeGreaterThan(0)
    expect(high.cloudsFar.length).toBeGreaterThan(0)
    expect(low.hillsFar.length).toBeLessThan(high.hillsFar.length)
  })

  it('keeps the level the same on both tiers', () => {
    expect(low.castle).toEqual(high.castle)
    expect(low.bricks).toEqual(high.bricks)
    expect(low.groundA).toEqual(high.groundA)
    expect(low.pipes).toEqual(PIPES)
  })

  it('lays the ground over the whole walkable span, split into two looks', () => {
    const top = [...high.groundA, ...high.groundB]
    expect(top).toHaveLength((X_MAX - X_MIN + 1) * 3)
    expect(high.groundB.length).toBeGreaterThan(0)
    expect(high.groundA.length).toBeGreaterThan(high.groundB.length)
    // Every top block is on the walking surface (its top at y = 0).
    for (const [, y] of top) expect(y).toBe(-0.5)
  })

  it('keeps floating bricks above the hero on the ground, and the wall to the castle', () => {
    for (const [, y] of high.bricks) expect(y - 0.5).toBeGreaterThan(HERO_HEIGHT)
    // Nothing at his height stands on his line (z = 0) before the castle wall.
    for (const [x, y, z] of high.castle) {
      if (y - 0.5 < HERO_HEIGHT && Math.abs(z) < 0.6)
        expect(x).toBeGreaterThanOrEqual(CASTLE_X - 3)
    }
    // He ends his walk inside the wall, behind its front face.
    expect(END_Z).toBeLessThan(0.5)
  })

  it('has contact shadows under pipes and the castle, all on the ground span', () => {
    expect(CONTACT_SHADOWS.length).toBeGreaterThanOrEqual(PIPES.length + 1)
    expect(CONTACT_SHADOWS.some(([x]) => x === CASTLE_X)).toBe(true)
    for (const [x, , w, d] of CONTACT_SHADOWS) {
      expect(x).toBeGreaterThan(X_MIN)
      expect(x).toBeLessThan(X_MAX)
      expect(w).toBeGreaterThan(0)
      expect(d).toBeGreaterThan(0)
    }
  })

  it('has backdrop layers that cover the whole run once they slide with the hero', () => {
    // A layer that follows the hero by f appears shifted by f * x: the farthest, the mountains.
    const xs = high.mountains.map(([x]) => x)
    expect(Math.min(...xs)).toBeLessThan(-30)
    expect(Math.max(...xs)).toBeGreaterThan(90)
  })
})
