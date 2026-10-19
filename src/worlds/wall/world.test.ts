import { describe, expect, it } from 'vitest'
import { HALF_FOV_TAN, PILE_BOX, wallCamera } from './world'

/** Phones in portrait up to a wide desktop. */
const ASPECTS = [0.42, 0.46, 0.5, 0.56, 0.75, 1, 1.33, 1.78, 2.4]

describe('wall camera', () => {
  it.each(ASPECTS)(
    'keeps the whole pile on screen, even turned, at aspect %f',
    (aspect) => {
      for (let u = 0; u <= 1; u += 0.05) {
        const { position, target } = wallCamera(u, aspect)
        // The pile's nearest corner is closer than its glass plane.
        const depth = position[2] - PILE_BOX.near
        const halfHeight = depth * HALF_FOV_TAN
        const halfWidth = halfHeight * aspect
        expect(PILE_BOX.halfWidth).toBeLessThan(halfWidth)
        expect(PILE_BOX.top - position[1]).toBeLessThan(halfHeight)
        expect(position[1] - PILE_BOX.bottom).toBeLessThan(halfHeight)
        expect(target[0]).toBe(position[0])
        expect(target[1]).toBe(position[1])
      }
    },
  )

  it.each([1.78, 2.4])(
    'leaves a seventh of a wide view below the pile for the caption (aspect %f)',
    (aspect) => {
      const { position } = wallCamera(1, aspect)
      const halfHeight = (position[2] - PILE_BOX.near) * HALF_FOV_TAN
      const empty = PILE_BOX.bottom - (position[1] - halfHeight)
      expect(empty).toBeGreaterThan(0.14 * 2 * halfHeight)
    },
  )

  it('drifts closer as the scroll goes on', () => {
    expect(wallCamera(1, 1.78).position[2]).toBeLessThan(wallCamera(0, 1.78).position[2])
  })

  it('pulls back as the screen gets narrower', () => {
    expect(wallCamera(0.5, 0.46).position[2]).toBeGreaterThan(
      wallCamera(0.5, 1.78).position[2],
    )
  })
})
