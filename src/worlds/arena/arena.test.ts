import { describe, expect, it } from 'vitest'
import { GATES, HALF_D, HALF_W, WALL_SEGMENTS, WALL_X, WALL_Z, entryPoint } from './arena'
import { captions } from './captions'
import { beats } from './beats'
import { arena } from './world'

describe('the walls', () => {
  it('leave each gate open and close everything else', () => {
    const blocks = (x: number, z: number) =>
      WALL_SEGMENTS.some(
        (s) => Math.abs(x - s.x) < s.sx / 2 && Math.abs(z - s.z) < s.sz / 2,
      )
    for (const gate of Object.values(GATES)) {
      const e = entryPoint(gate)
      // The line from outside the gate to the floor center crosses no wall piece.
      for (let t = 0; t <= 1; t += 0.01) {
        const along =
          gate.side === 'back'
            ? { x: e.x, z: e.z * (1 - t) }
            : { x: e.x * (1 - t), z: e.z }
        expect(blocks(along.x, along.z), `${gate.side} gate`).toBe(false)
      }
    }
    // The solid front and the parts of the other sides are there.
    expect(blocks(0, WALL_Z)).toBe(true)
    expect(blocks(-WALL_X, -3.9)).toBe(true)
    expect(blocks(WALL_X, 3.9)).toBe(true)
    expect(blocks(-4.5, -WALL_Z)).toBe(true)
  })

  it('stand just outside the floor', () => {
    for (const s of WALL_SEGMENTS) {
      expect(Math.abs(s.x) >= HALF_W || Math.abs(s.z) >= HALF_D).toBe(true)
    }
  })
})

describe('the arena world', () => {
  it('is the last world: no exit, the arena caption theme, a full share of the scroll', () => {
    expect(arena.id).toBe('arena')
    expect(arena.exit).toBeUndefined()
    expect(arena.theme).toBe('arena')
    expect(arena.scrollWeight).toBe(1)
  })

  it('keeps its captions out of the title beat, in order, inside the world', () => {
    expect(captions.length).toBeGreaterThanOrEqual(3)
    for (const c of captions) {
      expect(c.from).toBeGreaterThanOrEqual(0)
      expect(c.to).toBeLessThanOrEqual(beats.ranges.title[0])
    }
    // The title is DOM and carries the REA link; a caption must not compete with it.
    expect(captions.some((c) => c.link)).toBe(false)
  })

  it('has no caption over the bottom of the arena while the arena sits in its low band', () => {
    // From the merge on the arena is in the bottom 60%: captions there go to the top.
    for (const c of captions.filter((c) => c.to > beats.ranges.merge[0])) {
      expect(c.anchor).toBe('top')
    }
  })
})
