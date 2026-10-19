import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import {
  CASTLE_X,
  DOOR_HALF_WIDTH,
  END_Z,
  FLAG_X,
  HERO_START,
  LANE_Z,
  PIPES,
  QUESTION_X,
} from './config'
import {
  blockBump,
  coinPop,
  coinTaken,
  flagHeight,
  heroTravel,
  heroTurn,
  heroX,
  heroY,
  heroZ,
  JUMPS,
  RUN_END_X,
} from './hero'

const PIPE_TOP = 3.6

describe('hero motion', () => {
  it('runs from the start to the goal, then walks on to the castle door', () => {
    expect(heroX(0)).toBe(HERO_START)
    expect(heroX(beats.ranges.run[1])).toBeCloseTo(RUN_END_X)
    expect(heroX(1)).toBeCloseTo(CASTLE_X)
  })

  it('never goes backward', () => {
    for (let u = 0.001; u <= 1; u += 0.001) {
      expect(heroX(u)).toBeGreaterThanOrEqual(heroX(u - 0.001))
      expect(heroTravel(u)).toBeGreaterThanOrEqual(heroTravel(u - 0.001))
    }
  })

  it('reaches the flag before the run ends', () => {
    expect(heroX(beats.ranges.run[1])).toBeGreaterThan(FLAG_X)
  })

  it('stays on the ground between jumps and never goes underground', () => {
    for (let x = 0; x < 70; x += 0.05) expect(heroY(x)).toBeGreaterThanOrEqual(0)
    expect(heroY(5)).toBe(0)
    expect(heroY(33)).toBe(0)
  })

  it('peaks at each jump center', () => {
    for (const j of JUMPS) expect(heroY(j.at)).toBeCloseTo(j.height)
  })

  it('clears every pipe across its full width', () => {
    for (const pipe of PIPES) {
      for (let x = pipe - 1.3; x <= pipe + 1.3; x += 0.05) {
        expect(heroY(x)).toBeGreaterThan(PIPE_TOP)
      }
    }
  })

  it('jumps are separate (no two overlap)', () => {
    const sorted = [...JUMPS].sort((a, b) => a.at - b.at)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].at + sorted[i - 1].width / 2).toBeLessThanOrEqual(
        sorted[i].at - sorted[i].width / 2,
      )
    }
  })

  it('bumps the question block only as the hero passes under it', () => {
    expect(blockBump(QUESTION_X)).toBeCloseTo(0.45)
    expect(blockBump(QUESTION_X + 2)).toBe(0)
    expect(blockBump(QUESTION_X - 2)).toBe(0)
  })

  it('pops a coin after the bump, then it is gone', () => {
    expect(coinPop(QUESTION_X - 1)).toBeNull()
    expect(coinPop(QUESTION_X + 1.3)!.rise).toBeGreaterThan(2)
    expect(coinPop(QUESTION_X + 3)).toBeNull()
  })

  it('collects coins as the hero reaches them', () => {
    expect(coinTaken(14, 13)).toBe(false)
    expect(coinTaken(14, 14)).toBe(true)
  })

  it('slides the flag down at the goal', () => {
    expect(flagHeight(FLAG_X - 3, 8, 1)).toBe(8)
    expect(flagHeight(FLAG_X, 8, 1)).toBe(1)
  })

  describe('walking into the castle', () => {
    const wallFront = 0.5
    const wallLeft = CASTLE_X - 3.5

    it('stays on the run line until the run is over', () => {
      expect(heroZ(0)).toBe(0)
      expect(heroZ(beats.ranges.run[1])).toBe(0)
    })

    it('steps in front of the wall before reaching it, and never overlaps the wall', () => {
      // Facing along the run his arms reach 0.57 to each side (z); his front is 0.6 ahead (x).
      for (let u = 0; u <= beats.ranges.enter[0]; u += 0.001) {
        if (heroX(u) + 0.6 > wallLeft)
          expect(heroZ(u) - 0.57).toBeGreaterThanOrEqual(wallFront)
      }
      expect(LANE_Z - 0.57).toBeGreaterThanOrEqual(wallFront)
    })

    it('turns to face the door only once he has stopped at it', () => {
      expect(heroTurn(beats.ranges.turn[0])).toBe(0)
      expect(heroTurn(beats.ranges.turn[1])).toBeCloseTo(Math.PI / 2)
      expect(heroX(beats.ranges.turn[0])).toBeCloseTo(CASTLE_X)
    })

    it('ends inside the wall, centered on the door and out of sight', () => {
      expect(heroX(1)).toBeGreaterThan(CASTLE_X - DOOR_HALF_WIDTH)
      expect(heroX(1)).toBeLessThan(CASTLE_X + DOOR_HALF_WIDTH)
      expect(heroZ(1)).toBeCloseTo(END_Z)
      // Even his back (about 0.45 behind his center) is behind the wall's front face.
      expect(heroZ(beats.ranges.enter[1]) + 0.45).toBeLessThan(wallFront)
    })
  })
})
