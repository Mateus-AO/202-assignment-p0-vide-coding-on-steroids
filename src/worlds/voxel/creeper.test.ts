import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { creeperPose, creeperSpot, creeperVisible, wanderAt } from './creeper'

describe('creeper', () => {
  it('wanders within a few blocks of its spot before noticing the camera', () => {
    for (let t = 0; t < 120; t += 0.5) {
      const { position } = creeperPose(t, 0.1)
      expect(Math.abs(position[0] - creeperSpot[0])).toBeLessThanOrEqual(3.001)
      expect(Math.abs(position[2] - creeperSpot[2])).toBeLessThanOrEqual(2.001)
    }
  })

  it('actually moves while wandering', () => {
    expect(creeperPose(0, 0.1).position).not.toEqual(creeperPose(5, 0.1).position)
  })

  it('stands at its spot, stopped and facing the camera, once it has noticed', () => {
    const end = beats.ranges.notice[1]
    for (const t of [0, 3.3, 41]) {
      const pose = creeperPose(t, end)
      expect(pose.position[0]).toBeCloseTo(creeperSpot[0])
      expect(pose.position[2]).toBeCloseTo(creeperSpot[2])
      expect(pose.walking).toBe(0)
      expect(Math.abs(pose.yaw)).toBeCloseTo(0)
    }
  })

  it('turns gradually, not in one jump', () => {
    const [from, to] = beats.ranges.notice
    const t = 7
    const yaws = [0, 0.25, 0.5, 0.75, 1].map(
      (k) => creeperPose(t, from + (to - from) * k).yaw,
    )
    const base = wanderAt(t).yaw
    expect(yaws[0]).toBeCloseTo(base)
    expect(Math.abs(yaws[4])).toBeCloseTo(0)
    // Monotonic approach toward facing the camera.
    const dist = yaws.map((y) => Math.abs(Math.atan2(Math.sin(y), Math.cos(y))))
    for (let i = 1; i < dist.length; i++)
      expect(dist[i]).toBeLessThanOrEqual(dist[i - 1] + 1e-9)
  })

  it('is visible until it explodes', () => {
    expect(creeperVisible(0.1)).toBe(true)
    expect(creeperVisible(0.85)).toBe(true)
    expect(creeperVisible(0.9)).toBe(false)
  })
})
