import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { COIN_XS, FLAG_X, QUESTION_X } from './config'
import { coinTaken, heroX, heroY, JUMPS, runPhase } from './hero'
import { footstepXs, sound, uAtX } from './sound'

const steps = sound.cues.filter((c) => c.name.startsWith('step:'))

describe('platformer sound', () => {
  it('maps x back to progress', () => {
    for (const u of [0, 0.3, 1]) expect(uAtX(heroX(u))).toBeCloseTo(u)
  })

  it('steps every half run cycle, as the legs swing', () => {
    const xs = footstepXs()
    const halfCycle = Math.PI / (runPhase(1) - runPhase(0))
    for (let i = 1; i < xs.length; i++) {
      const gap = xs[i] - xs[i - 1]
      // Consecutive steps are one half cycle apart, or a whole number of them across a jump.
      const cycles = gap / halfCycle
      expect(Math.abs(cycles - Math.round(cycles))).toBeLessThan(0.02)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
    }
    expect(xs.length).toBeGreaterThan(20)
  })

  it('never steps in the air', () => {
    for (const x of footstepXs()) expect(heroY(x)).toBe(0)
    for (const { at, width } of JUMPS) {
      const inAir = footstepXs().filter(
        (x) => x > at - width / 2 + 0.1 && x < at + width / 2 - 0.1,
      )
      expect(inAir).toEqual([])
    }
  })

  it('marks steps continuous and everything else one-shot', () => {
    expect(steps.length).toBe(footstepXs().length)
    for (const c of sound.cues)
      expect(c.continuous === true).toBe(c.name.startsWith('step:'))
  })

  it('jumps at each take-off, bumps the block, picks up coins as they vanish', () => {
    expect(sound.cues.filter((c) => c.name.startsWith('jump:')).length).toBe(JUMPS.length)
    expect(sound.cues.find((c) => c.name === 'block:bump')?.at).toBeCloseTo(
      uAtX(QUESTION_X),
    )
    for (const x of COIN_XS) {
      const c = sound.cues.find((c) => c.name === `coin:${x}`)!
      const heroAt = heroX(c.at)
      expect(coinTaken(x, heroAt + 1e-9)).toBe(true)
      expect(coinTaken(x, heroAt - 0.01)).toBe(false)
    }
    expect(sound.cues.find((c) => c.name === 'goal')?.at).toBeCloseTo(uAtX(FLAG_X))
  })

  it('plays only well-formed notes', () => {
    for (const c of sound.cues) {
      const { voice, played } = recordVoice()
      c.play(voice)
      expect(played.length).toBeGreaterThan(0)
      for (const p of played) expect(specProblem(p.spec), c.name).toBeNull()
    }
  })
})
