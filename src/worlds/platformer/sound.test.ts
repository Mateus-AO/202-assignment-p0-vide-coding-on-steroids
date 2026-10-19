import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { COIN_XS, FLAG_X, QUESTION_X } from './config'
import { beats } from './beats'
import { coinTaken, heroTravel, heroX, heroY, JUMPS, runPhase, uAtX } from './hero'
import { footstepUs, sound } from './sound'

const steps = sound.cues.filter((c) => c.name.startsWith('step:'))

describe('platformer sound', () => {
  it('maps x back to progress, through the run and the walk to the door', () => {
    for (const u of [0, 0.3, beats.ranges.run[1], 0.78, beats.ranges.approach[1]]) {
      expect(uAtX(heroX(u))).toBeCloseTo(u)
    }
  })

  it('steps every half run cycle of distance walked', () => {
    const us = footstepUs()
    for (let i = 1; i < us.length; i++) {
      // Consecutive steps are one half cycle apart, or a whole number of them across a jump.
      const cycles =
        (runPhase(heroTravel(us[i])) - runPhase(heroTravel(us[i - 1]))) / Math.PI
      expect(Math.abs(cycles - Math.round(cycles))).toBeLessThan(0.02)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
    }
    expect(us.length).toBeGreaterThan(20)
  })

  it('never steps in the air', () => {
    for (const u of footstepUs()) expect(heroY(heroX(u))).toBe(0)
    for (const { at, width } of JUMPS) {
      const inAir = footstepUs().filter(
        (u) => u > uAtX(at - width / 2 + 0.1) && u < uAtX(at + width / 2 - 0.1),
      )
      expect(inAir).toEqual([])
    }
  })

  it('keeps stepping to the castle door and in, and stops while he stands turning', () => {
    const us = footstepUs()
    const within = ([from, to]: readonly [number, number]) =>
      us.filter((u) => u >= from && u <= to)
    expect(within(beats.ranges.approach).length).toBeGreaterThan(2)
    expect(within(beats.ranges.enter).length).toBeGreaterThanOrEqual(1)
    expect(within(beats.ranges.turn)).toEqual([])
    expect(us.every((u) => u <= beats.ranges.enter[1])).toBe(true)
  })

  it('thuds at the door as he walks in, and swells as the camera pushes into the dark', () => {
    expect(sound.cues.find((c) => c.name === 'door')?.at).toBe(beats.ranges.enter[0])
    expect(sound.cues.find((c) => c.name === 'dark')?.at).toBe(beats.ranges.dolly[0])
  })

  it('marks steps continuous and everything else one-shot', () => {
    expect(steps.length).toBe(footstepUs().length)
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
