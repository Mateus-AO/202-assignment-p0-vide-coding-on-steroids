import { describe, expect, it } from 'vitest'
import { PIPES, QUESTION_X, RUN_DISTANCE, HERO_START, FLAG_X } from './config'
import { blockBump, coinPop, coinTaken, flagHeight, heroX, heroY, JUMPS } from './hero'

const PIPE_TOP = 3.6

describe('hero motion', () => {
  it('runs from the start to the end of the run', () => {
    expect(heroX(0)).toBe(HERO_START)
    expect(heroX(1)).toBe(HERO_START + RUN_DISTANCE)
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
})
