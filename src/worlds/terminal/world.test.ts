import { describe, expect, it } from 'vitest'
import { HALF_FOV_TAN, SCREEN_H, SCREEN_W } from './layout'
import { MAX_TILT } from './tilt'
import { terminalCamera } from './world'

/** Phones in portrait up to a wide desktop. */
const ASPECTS = [0.42, 0.46, 0.5, 0.56, 0.75, 1, 1.78, 2.4]

describe('terminal camera', () => {
  it.each(ASPECTS)(
    'keeps the whole panel on screen, even tilted, at aspect %f',
    (aspect) => {
      for (let u = 0; u <= 1; u += 0.05) {
        const { position, target } = terminalCamera(u, aspect)
        // The tilted panel's nearest edge is a little closer than its center plane.
        const depth = position[2] - Math.sin(MAX_TILT) * (SCREEN_W / 2)
        const halfHeight = depth * HALF_FOV_TAN
        const halfWidth = halfHeight * aspect
        expect(SCREEN_W / 2).toBeLessThan(halfWidth)
        // Vertically the view is centered on the camera, not on the panel.
        const farEdge = Math.max(
          Math.abs(SCREEN_H / 2 - position[1]),
          Math.abs(-SCREEN_H / 2 - position[1]),
        )
        expect(farEdge).toBeLessThan(halfHeight)
        expect(target[1]).toBe(position[1])
      }
    },
  )

  it('looks straight at the panel from straight ahead', () => {
    const { position, target } = terminalCamera(0.5, 1.78)
    expect(position[0]).toBe(target[0])
    expect(position[1]).toBe(target[1])
    expect(position[2]).toBeGreaterThan(0)
  })

  it('drifts closer as the scroll goes on', () => {
    expect(terminalCamera(1, 1.78).position[2]).toBeLessThan(
      terminalCamera(0, 1.78).position[2],
    )
  })

  it('pulls back as the screen gets narrower', () => {
    expect(terminalCamera(0.5, 0.46).position[2]).toBeGreaterThan(
      terminalCamera(0.5, 1.78).position[2],
    )
  })
})
