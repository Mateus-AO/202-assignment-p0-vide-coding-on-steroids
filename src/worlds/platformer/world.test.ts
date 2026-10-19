import { describe, expect, it } from 'vitest'
import { HERO_HEIGHT } from './config'
import { heroX, heroY } from './hero'
import { HALF_FOV_TAN, platformerCamera } from './world'

/** Phones in portrait up to a wide desktop. */
const ASPECTS = [0.42, 0.46, 0.5, 0.56, 0.75, 1, 1.78, 2.4]

describe('platformer camera', () => {
  it.each(ASPECTS)('keeps the hero fully on screen at aspect %f', (aspect) => {
    for (let u = 0; u <= 1; u += 0.01) {
      const { position, target } = platformerCamera(u, aspect)
      const x = heroX(u)
      const feet = heroY(x)
      // The hero is on the z = 0 plane; the camera looks at that plane at `target`.
      const depth = position[2]
      const halfWidth = depth * HALF_FOV_TAN * aspect
      const halfHeight = depth * HALF_FOV_TAN

      expect(Math.abs(x - target[0])).toBeLessThan(halfWidth * 0.8)
      expect(feet - target[1]).toBeGreaterThan(-halfHeight * 0.95)
      expect(feet + HERO_HEIGHT - target[1]).toBeLessThan(halfHeight * 0.95)
    }
  })

  it('centers the hero on a narrow screen and leads him on a wide one', () => {
    const u = 0.3
    expect(platformerCamera(u, 0.46).target[0]).toBeCloseTo(heroX(u))
    expect(platformerCamera(u, 1.78).target[0]).toBeGreaterThan(heroX(u) + 3)
  })

  it('pulls back as the screen gets narrower', () => {
    expect(platformerCamera(0, 0.46).position[2]).toBeGreaterThan(
      platformerCamera(0, 1.78).position[2],
    )
  })
})
