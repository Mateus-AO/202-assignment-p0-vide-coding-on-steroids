import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { beats } from './beats'
import { assembleAmount, TV_COUNT, warmAmount } from './layout'
import { cueTime, sound, TIE_LAG, waveStart } from './sound'

const sets = Array.from({ length: TV_COUNT }, (_, i) => i)
const cue = (name: string) => sound.cues.find((c) => c.name === name)!
const STEP = 1e-5

/** The first progress, scanning forward, where `f` is above 0. */
function firstAbove(from: number, to: number, f: (u: number) => number) {
  for (let u = from; u <= to; u += STEP) if (f(u) > 0) return u
  return NaN
}

describe('wall sound', () => {
  it('has well-ordered, uniquely named cues inside the world', () => {
    const times = sound.cues.map((c) => c.at)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times.every((t) => t >= 0 && t <= 1)).toBe(true)
    const names = sound.cues.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has a warm, a scramble and a lock cue per set, then one finishing chord', () => {
    expect(sound.cues.length).toBe(TV_COUNT * 3 + 1)
    for (const i of sets) {
      for (const kind of ['warm', 'scramble', 'lock']) {
        expect(sound.cues.some((c) => c.name === `${kind}:${i}`)).toBe(true)
      }
    }
  })

  it('starts each set warm cue where warmAmount first leaves 0', () => {
    for (const i of sets) {
      const first = firstAbove(0, 1, (u) => warmAmount(i, u))
      expect(waveStart(beats.ranges.warm, i)).toBeCloseTo(first, 4)
      const at = cue(`warm:${i}`).at
      expect(at).toBeGreaterThanOrEqual(first - 2 * STEP)
      expect(at - first).toBeLessThanOrEqual(3 * TIE_LAG + 2 * STEP)
      expect(at).toBeGreaterThanOrEqual(beats.ranges.warm[0])
      expect(at).toBeLessThanOrEqual(beats.ranges.warm[1])
    }
  })

  it('starts each set scramble and lock cue with assembleAmount', () => {
    const out = { scramble: 0, lock: 0 }
    for (const i of sets) {
      const scramble = firstAbove(0, 1, (u) => assembleAmount(i, u, out).scramble)
      const lock = firstAbove(0, 1, (u) => assembleAmount(i, u, out).lock)
      const lag = cueTime(beats.ranges.assemble, i) - waveStart(beats.ranges.assemble, i)
      expect(waveStart(beats.ranges.assemble, i)).toBeCloseTo(scramble, 4)
      expect(cue(`scramble:${i}`).at).toBeCloseTo(scramble + lag, 4)
      expect(cue(`lock:${i}`).at).toBeCloseTo(lock + lag, 4)
      expect(cue(`lock:${i}`).at).toBeGreaterThan(cue(`scramble:${i}`).at)
      expect(cue(`lock:${i}`).at).toBeLessThan(beats.ranges.assemble[1])
    }
  })

  it('runs the waves from the center outward', () => {
    const order = (kind: string) =>
      [...sets].sort((a, b) => cue(`${kind}:${a}`).at - cue(`${kind}:${b}`).at)
    for (const kind of ['warm', 'scramble', 'lock']) {
      expect(order(kind)[0]).toBe(5) // the middle set of the middle row
    }
  })

  it('finishes with a chord when the assemble beat ends, after every other cue', () => {
    const chord = cue('complete')
    expect(chord.at).toBe(beats.ranges.assemble[1])
    expect(sound.cues[sound.cues.length - 1]).toBe(chord)
    for (const c of sound.cues) expect(c.at).toBeLessThanOrEqual(chord.at)
  })

  it('keeps the cues clear of the hold, and never crowds more than three into a frame', () => {
    expect(sound.cues[0].at).toBeGreaterThanOrEqual(beats.ranges.hold[1])
    // A frame of fast scrolling crosses well under 0.003 of progress; the director plays the
    // latest 3 cues of a frame, so no such window may hold more than that.
    const MAX_PER_FRAME = 3
    const WINDOW = 0.003
    for (const first of sound.cues) {
      const inWindow = sound.cues.filter(
        (c) => c.at >= first.at && c.at < first.at + WINDOW,
      )
      expect(inWindow.length, first.name).toBeLessThanOrEqual(MAX_PER_FRAME)
    }
  })

  it('marks no cue continuous: one-shots still play in reduced motion', () => {
    for (const c of sound.cues) expect(c.continuous, c.name).not.toBe(true)
  })

  it('plays only well-formed notes, and stays quiet', () => {
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

  it('has a quiet bed whose first layer is the hiss', () => {
    expect(sound.bed.layers[0].source).toBe('noise')
    const total = sound.bed.layers.reduce((a, l) => a + l.gain, 0)
    expect(total).toBeLessThan(0.05)
  })
})
