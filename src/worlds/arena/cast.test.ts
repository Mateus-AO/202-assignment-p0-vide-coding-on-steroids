import { describe, expect, it } from 'vitest'
import { GATES, HALF_D, HALF_W, PIPE, entryPoint } from './arena'
import { beats } from './beats'
import {
  ARRIVE,
  CAST,
  MERGE_LENGTH,
  MERGE_START,
  TABLEAU,
  hopHeight,
  hopTakeoffs,
  mergeAmount,
  newPose,
  patrolTurns,
  poseAt,
  rallyContacts,
  type CastId,
  type Pose,
} from './cast'
import { GLYPH_CELLS } from './glyph'

const at = (id: CastId, u: number): Pose => poseAt(id, u, newPose())
const dist = (a: Pose, b: Pose) => Math.hypot(a.x - b.x, a.z - b.z)
const STEP = 0.002

describe('arrival', () => {
  it('fits inside the arrive beat, each character through its own gate', () => {
    for (const id of CAST) {
      const [from, to] = ARRIVE[id]
      expect(from).toBeGreaterThanOrEqual(beats.ranges.arrive[0])
      expect(to).toBeLessThanOrEqual(beats.ranges.arrive[1])
    }
    expect(new Set(Object.values(GATES).map((g) => `${g.side}${g.at}`)).size).toBe(
      Object.keys(GATES).length,
    )
  })

  it('starts every character outside the walls, hidden, and ends it on the floor', () => {
    for (const id of CAST) {
      const start = at(id, 0)
      expect(start.scale, id).toBe(0)
      expect(Math.abs(start.x) > HALF_W || Math.abs(start.z) > HALF_D, id).toBe(true)
      const end = at(id, beats.ranges.arrive[1])
      expect(end.scale, id).toBe(1)
      expect(Math.abs(end.x), id).toBeLessThanOrEqual(HALF_W)
      expect(Math.abs(end.z), id).toBeLessThanOrEqual(HALF_D)
    }
  })

  it('has every gate walkers start in line with it', () => {
    for (const id of ['hero', 'creature', 'walker', 'paddle'] as const) {
      const e = entryPoint(GATES[id])
      const p = at(id, 0)
      expect(p.x).toBeCloseTo(e.x, 5)
      expect(p.z).toBeCloseTo(e.z, 5)
    }
  })
})

describe('the party', () => {
  it('keeps everyone on the floor and in front of the walls', () => {
    for (let u = beats.ranges.party[0]; u <= beats.ranges.party[1]; u += STEP) {
      for (const id of CAST) {
        const p = at(id, u)
        expect(Math.abs(p.x), `${id} @${u}`).toBeLessThanOrEqual(HALF_W - 0.3)
        expect(Math.abs(p.z), `${id} @${u}`).toBeLessThanOrEqual(HALF_D - 0.3)
      }
    }
  })

  it('keeps different characters at least a step apart (the paddle and its ball excepted)', () => {
    for (let u = beats.ranges.party[0]; u <= beats.ranges.party[1]; u += STEP) {
      const poses = Object.fromEntries(CAST.map((id) => [id, at(id, u)])) as Record<
        CastId,
        Pose
      >
      for (const a of CAST) {
        for (const b of CAST) {
          if (a >= b) continue
          if ((a === 'ball' && b === 'paddle') || (a === 'paddle' && b === 'ball'))
            continue
          expect(dist(poses[a], poses[b]), `${a}/${b} @${u}`).toBeGreaterThan(1)
        }
      }
    }
  })

  it('returns the ball: the paddle is in line with it at every contact', () => {
    for (const c of rallyContacts().filter((c) => c.kind === 'paddle')) {
      const ball = at('ball', c.u)
      const paddle = at('paddle', c.u)
      expect(Math.abs(ball.z - paddle.z)).toBeLessThan(0.25)
      expect(ball.x - paddle.x).toBeLessThan(0.7)
    }
    expect(rallyContacts().length).toBeGreaterThanOrEqual(6)
  })

  it('hops the pipe: airborne only over it, and clear of the pipe', () => {
    const hops = hopTakeoffs()
    expect(hops.length).toBeGreaterThanOrEqual(3)
    for (let u = 0; u <= 1; u += 0.001) {
      const h = at('hero', u)
      if (h.y > 0.05) expect(Math.abs(h.x - PIPE.x), `@${u}`).toBeLessThan(0.85)
      if (Math.abs(h.x - PIPE.x) < 0.3 && u >= beats.ranges.party[0] && u < 0.56)
        expect(h.y, `@${u}`).toBeGreaterThan(0.5)
    }
    expect(hopHeight(PIPE.x)).toBeGreaterThan(0.6)
    expect(hopHeight(PIPE.x + 1)).toBe(0)
  })

  it('patrols: the walker turns round inside the party', () => {
    for (const u of patrolTurns()) {
      expect(u).toBeGreaterThan(beats.ranges.party[0])
      expect(u).toBeLessThan(beats.ranges.party[1])
    }
  })

  it('walks while it moves and stands when it does not', () => {
    expect(at('hero', 0.4).walk).toBeGreaterThan(0.9)
    expect(at('hero', 0.9).walk).toBe(0)
    expect(at('walker', 1).walk).toBe(0)
  })
})

describe('the merge', () => {
  it('is over before the title starts', () => {
    for (const id of CAST) {
      expect(MERGE_START[id]).toBeGreaterThanOrEqual(beats.ranges.merge[0])
      expect(MERGE_START[id] + MERGE_LENGTH).toBeLessThan(beats.ranges.title[0])
      expect(mergeAmount(id, beats.ranges.title[0])).toBe(1)
    }
  })

  it('holds a calm tableau for the whole title, facing the camera side', () => {
    for (const id of CAST) {
      const a = at(id, beats.ranges.title[0])
      const b = at(id, 1)
      expect(a.x).toBeCloseTo(TABLEAU[id].x, 4)
      expect(a.z).toBeCloseTo(TABLEAU[id].z, 4)
      expect(a.x).toBeCloseTo(b.x, 6)
      expect(a.z).toBeCloseTo(b.z, 6)
      expect(a.yaw).toBeCloseTo(b.yaw, 6)
      expect(b.walk).toBe(0)
      expect(b.y).toBe(0)
    }
  })

  it('leaves room between characters in the tableau and keeps them off the ring tiles', () => {
    for (const a of CAST) {
      for (const b of CAST) {
        if (a >= b) continue
        const gap = Math.hypot(TABLEAU[a].x - TABLEAU[b].x, TABLEAU[a].z - TABLEAU[b].z)
        expect(gap, `${a}/${b}`).toBeGreaterThan(0.9)
      }
      for (const cell of GLYPH_CELLS) {
        const d = Math.hypot(TABLEAU[a].x - cell.x, TABLEAU[a].z - cell.z)
        expect(d, `${a} on a tile`).toBeGreaterThan(0.45)
      }
    }
  })

  it('never lets anyone leave the arena on the way in', () => {
    for (let u = beats.ranges.merge[0]; u <= 1; u += STEP) {
      for (const id of CAST) {
        const p = at(id, u)
        expect(Math.abs(p.x)).toBeLessThanOrEqual(HALF_W)
        expect(Math.abs(p.z)).toBeLessThanOrEqual(HALF_D)
      }
    }
  })
})

describe('scrubbing', () => {
  it('is a pure function of progress: the same u gives the same pose, in any order', () => {
    const us = [0.9, 0.1, 0.5, 0.33, 0.6, 0.1, 0.9]
    const first = new Map<number, string>()
    for (const u of us) {
      const key = CAST.map((id) => JSON.stringify(at(id, u))).join('|')
      if (first.has(u)) expect(key).toBe(first.get(u))
      else first.set(u, key)
    }
  })

  it('has no jumps: poses change smoothly with progress', () => {
    for (const id of CAST) {
      let prev = at(id, 0.05)
      for (let u = 0.05 + 0.001; u <= 1; u += 0.001) {
        const p = at(id, u)
        // Walking in is the fastest thing the cast does; it must stay under a step per 0.001.
        expect(dist(p, prev), `${id} @${u}`).toBeLessThan(0.6)
        prev = p
      }
    }
  })

  it('never produces NaN', () => {
    for (let u = 0; u <= 1; u += 0.0137) {
      for (const id of CAST) {
        for (const v of Object.values(at(id, u))) expect(Number.isFinite(v)).toBe(true)
      }
    }
  })
})
