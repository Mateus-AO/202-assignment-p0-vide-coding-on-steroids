import { describe, expect, it } from 'vitest'
import { HALF_FOV_TAN, SCREEN_H, SCREEN_W } from './layout'
import { MAX_TILT } from './tilt'
import { frameAt, scrollBoundary } from '@/core/timeline'
import type { WorldModule } from '@/core/world'
import { SHUTDOWN, STORY_END, storyToU, uToStory } from './beats'
import { terminal, terminalCamera } from './world'

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

describe('terminal shutdown', () => {
  const next: WorldModule = {
    id: 'next',
    Scene: () => null,
    cameraPath: () => ({ position: [0, 0, 1], target: [0, 0, 0] }),
    captions: [],
  }
  const pair = [terminal, next]
  // Where the terminal ends on a page of just these two worlds.
  const boundary = scrollBoundary(pair, 1)

  it('is longer on the scroll by the shutdown, so the story keeps its distance', () => {
    expect(terminal.scrollWeight).toBeCloseTo(1 / STORY_END)
    // The story (the first STORY_END of the world) takes one plain world-length of scroll.
    expect((terminal.scrollWeight ?? 1) * STORY_END).toBeCloseTo(1)
    expect(boundary * (1 + STORY_END)).toBeCloseTo(1)
  })

  it('exits as a crt cover over the last tenth, then hands over to a black reveal', () => {
    expect(terminal.exit).toMatchObject({
      kind: 'cover',
      style: 'crt',
      whiteFrom: SHUTDOWN[0],
      whiteFull: SHUTDOWN[1],
    })
    expect(frameAt(pair, boundary * STORY_END).cover.mode).toBe(0)
    expect(frameAt(pair, boundary - 1e-9).cover).toMatchObject({ mode: 1, style: 'crt' })
    expect(frameAt(pair, boundary - 1e-9).cover.t).toBeCloseTo(1)
    expect(frameAt(pair, boundary).cover).toMatchObject({ mode: 2, t: 0, style: 'crt' })
  })

  it('maps story time onto the first part of its progress and back', () => {
    for (const s of [0, 0.25, 0.5, 1]) expect(uToStory(storyToU(s))).toBeCloseTo(s)
    expect(uToStory(1)).toBe(1)
    expect(uToStory(SHUTDOWN[0])).toBeCloseTo(1)
  })

  it('plays the camera in story time, then holds the last frame', () => {
    for (const aspect of [0.46, 1.78]) {
      expect(terminal.cameraPath(0, aspect)).toEqual(terminalCamera(0, aspect))
      expect(terminal.cameraPath(STORY_END / 2, aspect)).toEqual(
        terminalCamera(0.5, aspect),
      )
      expect(terminal.cameraPath(STORY_END, aspect)).toEqual(terminalCamera(1, aspect))
      expect(terminal.cameraPath(0.95, aspect)).toEqual(terminalCamera(1, aspect))
      expect(terminal.cameraPath(1, aspect)).toEqual(terminalCamera(1, aspect))
    }
  })

  it('places the captions at the same story moments, and ends them with the story', () => {
    const [first, second] = terminal.captions
    expect(first.from).toBeCloseTo(0.12 * STORY_END)
    expect(first.to).toBeCloseTo(0.34 * STORY_END)
    expect(second.from).toBeCloseTo(0.74 * STORY_END)
    expect(second.to).toBeCloseTo(STORY_END)
  })
})
