import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import {
  CASTLE_X,
  COIN_XS,
  DOOR_FRAME_DEPTH,
  DOOR_FRAME_WIDTH,
  DOOR_HALF_WIDTH,
  END_Z,
  FLAG_X,
  HERO_START,
  LANE_Z,
  PIPES,
  QUESTION_X,
  WALKER_HALF_WIDTH,
  WALKER_PACE,
  WALKER_TOP,
  WALKER_X,
} from './config'
import {
  blockBump,
  blockHit,
  coinCollect,
  coinPop,
  coinSpin,
  coinTaken,
  flagHeight,
  heroCheer,
  heroSquash,
  heroStride,
  heroTravel,
  heroTurn,
  heroX,
  heroY,
  heroZ,
  JUMPS,
  jumpProgress,
  RUN_END_X,
  walkerStep,
  walkerX,
  walkerYaw,
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

  it('keeps clear of the door surround until he turns into the doorway', () => {
    const wallFront = 0.5
    const frameLeft = CASTLE_X - DOOR_HALF_WIDTH - DOOR_FRAME_WIDTH
    for (let u = 0; u <= beats.ranges.enter[0]; u += 0.001) {
      // He is 0.6 long and his arms reach 0.57 to each side while he faces along the run.
      if (heroX(u) + 0.6 > frameLeft)
        expect(heroZ(u) - 0.57).toBeGreaterThanOrEqual(wallFront + DOOR_FRAME_DEPTH)
    }
  })

  it('fits the doorway once turned: his arms reach less than the opening is wide', () => {
    expect(0.57).toBeLessThan(DOOR_HALF_WIDTH)
  })

  describe('the walker', () => {
    it('paces around its spot and only depends on where the hero is', () => {
      for (let x = 0; x < 70; x += 0.25) {
        expect(Math.abs(walkerX(x) - WALKER_X)).toBeLessThanOrEqual(WALKER_PACE + 1e-9)
        expect(walkerX(x)).toBe(walkerX(x))
      }
      expect(walkerYaw(0)).toBeGreaterThanOrEqual(0)
      expect(walkerStep(2)).toBeGreaterThan(walkerStep(1))
    })

    it('never touches the hero: he is above its spikes whenever they are in line', () => {
      for (let x = WALKER_X - 6; x <= WALKER_X + 6; x += 0.02) {
        // The hero is about 0.4 wide each side; the walker WALKER_HALF_WIDTH.
        if (Math.abs(x - walkerX(x)) < WALKER_HALF_WIDTH + 0.4)
          expect(heroY(x)).toBeGreaterThanOrEqual(WALKER_TOP)
      }
    })
  })

  describe('pose', () => {
    it('knows where he is in a jump', () => {
      expect(jumpProgress(5)).toBe(-1)
      for (const j of JUMPS) {
        expect(jumpProgress(j.at)).toBeCloseTo(0.5)
        expect(jumpProgress(j.at - j.width / 2 - 0.1)).toBe(-1)
      }
    })

    it('squashes and stretches only around jumps, and never by much', () => {
      expect(heroSquash(5)).toBe(0)
      expect(heroSquash(HERO_START)).toBe(0)
      for (let x = 0; x < 70; x += 0.01) expect(Math.abs(heroSquash(x))).toBeLessThan(0.2)
      const pipe = JUMPS[0]
      expect(heroSquash(pipe.at)).toBeGreaterThan(0.05) // stretched at the top
      expect(heroSquash(pipe.at + pipe.width / 2 + 0.2)).toBeLessThan(-0.03) // squashed on landing
      expect(heroSquash(pipe.at - pipe.width / 2 - 0.2)).toBeLessThan(-0.03) // crouched before
    })

    it('cheers at the pole and nowhere else', () => {
      expect(heroCheer(10)).toBe(0)
      expect(heroCheer(FLAG_X)).toBeGreaterThan(0.9)
      expect(heroCheer(FLAG_X + 3)).toBeCloseTo(0)
    })

    it('strides while he moves and stands still while he turns at the door', () => {
      expect(heroStride(0.3)).toBe(1)
      expect(heroStride(beats.ranges.approach[1] - 0.001)).toBe(1)
      const mid = (beats.ranges.turn[0] + beats.ranges.turn[1]) / 2
      expect(heroStride(mid)).toBeLessThan(0.05)
      expect(heroStride(beats.ranges.enter[1])).toBe(1)
      for (let u = 0; u <= 1; u += 0.001) {
        expect(heroStride(u)).toBeGreaterThanOrEqual(0)
        expect(heroStride(u)).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('juice', () => {
    it('flies a coin up and away once the hero takes it', () => {
      const cx = COIN_XS[0]
      expect(coinCollect(cx, cx - 1)).toBe(0)
      expect(coinCollect(cx, cx + 0.2)).toBeGreaterThan(0.4)
      expect(coinCollect(cx, cx + 3)).toBe(1)
      expect(coinTaken(cx, cx - 0.3)).toBe(true)
    })

    it("spins coins with the hero's run, not with the clock", () => {
      expect(coinSpin(10, 0)).toBe(coinSpin(10, 0))
      expect(coinSpin(11, 0)).toBeGreaterThan(coinSpin(10, 0))
      expect(coinSpin(10, 1)).not.toBe(coinSpin(10, 0))
    })

    it('turns the question block plain once it has been hit, and back when scrubbed', () => {
      expect(blockHit(QUESTION_X - 1)).toBe(false)
      expect(blockHit(QUESTION_X + 1)).toBe(true)
    })
  })
})
