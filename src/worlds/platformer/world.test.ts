import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { CASTLE_X, DOOR_HALF_WIDTH, DOOR_TOP, DOOR_Z, HERO_HEIGHT } from './config'
import { heroX, heroY } from './hero'
import { HALF_FOV_TAN, platformerCamera } from './world'

/** Phones in portrait up to a wide desktop. */
const ASPECTS = [0.42, 0.46, 0.5, 0.56, 0.75, 1, 1.78, 2.4]

describe('platformer camera', () => {
  it.each(ASPECTS)('keeps the hero fully on screen at aspect %f', (aspect) => {
    // Up to the dolly: after that the camera leaves him for the door.
    for (let u = 0; u <= beats.ranges.dolly[0]; u += 0.01) {
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

describe('platformer camera at the castle door', () => {
  it.each(ASPECTS)(
    'ends with the dark door filling the screen at aspect %f',
    (aspect) => {
      const { position, target } = platformerCamera(1, aspect)
      const depth = position[2] - DOOR_Z
      expect(depth).toBeGreaterThan(0.1) // in front of the door, past the near plane
      expect(position[0]).toBeCloseTo(CASTLE_X)
      expect(target[0]).toBeCloseTo(CASTLE_X)
      // The view is centered on the door and narrower and shorter than the door itself.
      expect(Math.abs(position[1] - DOOR_TOP / 2)).toBeLessThan(1e-9)
      expect(depth * HALF_FOV_TAN).toBeLessThan(DOOR_TOP / 2)
      expect(depth * HALF_FOV_TAN * aspect).toBeLessThan(DOOR_HALF_WIDTH)
    },
  )

  it.each(ASPECTS)(
    'keeps the camera in front of the castle wall at aspect %f',
    (aspect) => {
      for (let u = 0; u <= 1; u += 0.005) {
        expect(platformerCamera(u, aspect).position[2]).toBeGreaterThan(DOOR_Z)
      }
    },
  )

  it('stays put while the hero turns and walks in, then moves in only after', () => {
    const before = platformerCamera(beats.ranges.turn[0], 1.78)
    const during = platformerCamera(beats.ranges.enter[0], 1.78)
    expect(during.position[2]).toBeCloseTo(before.position[2])
    expect(platformerCamera(0.95, 1.78).position[2]).toBeLessThan(during.position[2])
  })

  it('has the dark door filling the screen before the black fade begins', () => {
    for (const aspect of ASPECTS) {
      const { position } = platformerCamera(beats.ranges.dark[0], aspect)
      const depth = position[2] - DOOR_Z
      expect(depth * HALF_FOV_TAN * aspect).toBeLessThan(DOOR_HALF_WIDTH)
      expect(depth * HALF_FOV_TAN).toBeLessThan(DOOR_TOP / 2)
    }
  })
})
