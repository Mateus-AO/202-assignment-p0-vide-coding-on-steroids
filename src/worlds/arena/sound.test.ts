import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { beats } from './beats'
import { ARRIVE, CAST, rallyContacts } from './cast'
import { glyphProgress } from './glyph'
import { STEPS_PER_ARRIVAL, sound, uAtDrawn } from './sound'

const cue = (name: string) => sound.cues.find((c) => c.name === name)!

describe('arena sound', () => {
  it('has well-ordered, uniquely named cues inside the world', () => {
    const times = sound.cues.map((c) => c.at)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times.every((t) => t >= 0 && t <= 1)).toBe(true)
    const names = sound.cues.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('walks every character in with footsteps inside its arrival window', () => {
    for (const id of CAST) {
      const steps = sound.cues.filter((c) => c.name.startsWith(`step:${id}:`))
      expect(steps.length).toBe(STEPS_PER_ARRIVAL)
      for (const s of steps) {
        expect(s.at).toBeGreaterThan(ARRIVE[id][0])
        expect(s.at).toBeLessThan(ARRIVE[id][1])
        expect(s.continuous).toBe(true)
      }
    }
  })

  it('plays a blip at every contact of the rally after the serve', () => {
    const rally = sound.cues.filter((c) => c.name.startsWith('rally:'))
    expect(rally.length).toBe(rallyContacts().length - 1)
  })

  it('lights the ring in order and ends on the merge chord at the title', () => {
    const order = ['ring:node-a', 'ring:line', 'ring:arrow', 'ring:node-b'].map(
      (n) => cue(n).at,
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order[0]).toBeGreaterThanOrEqual(beats.ranges.merge[0])
    expect(order[3]).toBeLessThan(beats.ranges.title[0])
    expect(glyphProgress(uAtDrawn(0.5))).toBeCloseTo(0.5, 3)
    const chord = cue('merged')
    expect(chord.at).toBe(beats.ranges.title[0])
    expect(chord.continuous).not.toBe(true)
    expect(sound.cues[sound.cues.length - 1]).toBe(chord)
  })

  it('never crowds more than three cues into a frame of fast scrolling', () => {
    for (const first of sound.cues) {
      const inWindow = sound.cues.filter(
        (c) => c.at >= first.at && c.at < first.at + 0.003,
      )
      expect(inWindow.length, first.name).toBeLessThanOrEqual(3)
    }
  })

  it('plays only well-formed, quiet notes', () => {
    for (const c of sound.cues) {
      const { voice, played } = recordVoice()
      c.play(voice)
      expect(played.length, c.name).toBeGreaterThan(0)
      for (const p of played) {
        expect(specProblem(p.spec), c.name).toBeNull()
        expect(p.spec.gain, c.name).toBeLessThanOrEqual(0.1)
      }
    }
  })

  it('has a quiet bed', () => {
    const total = sound.bed.layers.reduce((a, l) => a + l.gain, 0)
    expect(total).toBeLessThan(0.05)
  })
})
