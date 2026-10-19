import { describe, expect, it } from 'vitest'
import { COIN_XS, QUESTION_X } from './config'
import { EMITTERS, particleAt, SLOTS, type Particle } from './effects'
import { JUMPS } from './hero'

const out = (): Particle => ({ x: 0, y: 0, z: 0, size: 0, spin: 0 })

describe('particles', () => {
  it('has a puff at every take-off and landing, every coin and the block', () => {
    expect(EMITTERS).toHaveLength(JUMPS.length * 2 + COIN_XS.length + 1)
    expect(SLOTS).toHaveLength(EMITTERS.reduce((n, e) => n + e.count, 0))
  })

  it('stays small: one instanced mesh of under a hundred cubes', () => {
    expect(SLOTS.length).toBeLessThan(100)
  })

  it('is not alive before it goes off or after it has faded', () => {
    for (const slot of SLOTS) {
      const p = out()
      expect(particleAt(slot, slot.emitter.at - 0.01, p)).toBe(false)
      expect(particleAt(slot, slot.emitter.at + slot.emitter.life + 0.01, p)).toBe(false)
    }
  })

  it('stays above the ground, finite and shrinking while alive', () => {
    for (const slot of SLOTS) {
      const { at, life, origin } = slot.emitter
      const p = out()
      let lastSize = Infinity
      for (let a = 0.02; a < 1; a += 0.02) {
        expect(particleAt(slot, at + a * life, p)).toBe(true)
        expect(p.y).toBeGreaterThanOrEqual(0.05)
        expect(Number.isFinite(p.x + p.y + p.z + p.size + p.spin)).toBe(true)
        expect(p.size).toBeLessThanOrEqual(lastSize + 1e-9)
        expect(Math.abs(p.x - origin[0])).toBeLessThan(2)
        lastSize = p.size
      }
    }
  })

  it('is a function of the hero x alone: the same x gives the same particle', () => {
    const slot = SLOTS.find((s) => s.emitter.at === QUESTION_X)!
    const a = out()
    const b = out()
    particleAt(slot, QUESTION_X + 0.5, a)
    particleAt(slot, QUESTION_X + 0.9, b) // scrub forward ...
    const c = out()
    particleAt(slot, QUESTION_X + 0.5, c) // ... and back
    expect(c).toEqual(a)
  })
})
