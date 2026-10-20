import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { arenaCamera, FRAME_POINTS, HALF_FOV_TAN, openBand, titleBand } from './camera'

/** Phones in portrait up to an ultrawide. */
const ASPECTS = [0.42, 0.46, 0.56, 0.75, 1, 1.33, 1.78, 2.4]

type V = [number, number, number]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const unit = (a: V): V => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}

/** Projects a point the way three's lookAt camera does (fov 50, world up = +y): NDC x, y. */
function ndc(u: number, aspect: number, point: V) {
  const { position, target } = arenaCamera(u, aspect)
  const forward = unit(sub(target, position))
  const right = unit(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const rel = sub(point, position)
  const depth = dot(rel, forward)
  return {
    x: dot(rel, right) / (depth * HALF_FOV_TAN * aspect),
    y: dot(rel, up) / (depth * HALF_FOV_TAN),
    depth,
  }
}

describe('arena camera', () => {
  it.each(ASPECTS)(
    'frames the whole arena in the title band from the merge on, at aspect %f',
    (aspect) => {
      const band = titleBand(aspect)
      for (let u = beats.ranges.merge[0]; u <= 1; u += 0.05) {
        for (const p of FRAME_POINTS) {
          const s = ndc(u, aspect, [...p])
          expect(s.depth).toBeGreaterThan(0)
          expect(s.y, `u=${u}`).toBeLessThanOrEqual(band.hi + 1e-6)
          expect(s.y, `u=${u}`).toBeGreaterThanOrEqual(band.lo - 1e-6)
          expect(Math.abs(s.x), `u=${u}`).toBeLessThanOrEqual(band.halfWidth + 1e-6)
        }
      }
    },
  )

  it.each(ASPECTS)(
    'keeps the top 36% of the screen clear of the arena at aspect %f',
    (aspect) => {
      // The title takes the top 36% (38% on phones): NDC y above 1 - 2 * 0.38.
      const limit = 1 - 2 * (aspect < 0.7 ? 0.38 : 0.36)
      for (const p of FRAME_POINTS) {
        expect(ndc(0.8, aspect, [...p]).y).toBeLessThan(limit)
      }
    },
  )

  it.each(ASPECTS)(
    'keeps the whole arena in view before the merge too, at aspect %f',
    (aspect) => {
      const band = openBand(aspect)
      for (let u = 0; u <= 0.46; u += 0.05) {
        for (const p of FRAME_POINTS) {
          const s = ndc(u, aspect, [...p])
          expect(s.y, `u=${u}`).toBeLessThanOrEqual(band.hi + 1e-6)
          expect(s.y, `u=${u}`).toBeGreaterThanOrEqual(band.lo - 1e-6)
          expect(Math.abs(s.x)).toBeLessThanOrEqual(band.halfWidth + 1e-6)
        }
      }
    },
  )

  it('looks down at about 65 degrees and never rolls', () => {
    for (const aspect of [0.46, 1.78]) {
      for (const u of [0, 0.5, 1]) {
        const { position, target } = arenaCamera(u, aspect)
        const d = sub(target, position)
        const pitch = Math.atan2(-d[1], -d[2])
        expect((pitch * 180) / Math.PI).toBeCloseTo(65, 4)
        expect(d[0]).toBe(0)
        expect(position[0]).toBe(0)
      }
    }
  })

  it('is steady once the title starts and uses the room better on a wide screen', () => {
    const a = arenaCamera(beats.ranges.title[0], 1.78)
    const b = arenaCamera(1, 1.78)
    expect(a.position).toEqual(b.position)
    // The width limits a phone, the height a wide screen: the wide one sits closer.
    const phone = arenaCamera(1, 0.46).position[2]
    const wide = arenaCamera(1, 1.78).position[2]
    expect(wide).toBeLessThan(phone)
  })
})
