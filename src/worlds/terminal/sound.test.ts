import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { SHUTDOWN, STORY_END, storyToU } from './beats'
import { LINES } from './script'
import { SCRAMBLE_SPAN } from './screen'
import { PIP_AT, sound, tickFor } from './sound'

const cue = (name: string) => sound.cues.find((c) => c.name === name)!
const ticks = sound.cues.filter((c) => c.name.startsWith('tick:'))
const chirps = sound.cues.filter((c) => c.name.startsWith('decode:'))
const typed = LINES.filter((l) => l.span > 0 && l.text.trim().length > 0)
const swapped = LINES.filter((l) => l.swapAt !== undefined)

describe('terminal sound', () => {
  it('has well-ordered, uniquely named cues inside the world', () => {
    const times = sound.cues.map((c) => c.at)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(times.every((t) => t >= 0 && t <= 1)).toBe(true)
    const names = sound.cues.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('ticks once at the start of every typed line, in story time', () => {
    expect(ticks.length).toBe(typed.length)
    expect(ticks.length).toBeGreaterThan(20)
    for (const l of typed) {
      expect(cue(`tick:${LINES.indexOf(l)}`).at).toBe(storyToU(l.start))
    }
    // None for blank lines or the bare closing prompt.
    for (const l of LINES.filter((l) => !typed.includes(l))) {
      expect(sound.cues.some((c) => c.name === `tick:${LINES.indexOf(l)}`)).toBe(false)
    }
  })

  it('chirps at each decode swap, in story time, one chirp per swapped line', () => {
    expect(chirps.length).toBe(swapped.length)
    expect(chirps.length).toBeGreaterThan(0)
    for (const l of swapped) {
      expect(cue(`decode:${LINES.indexOf(l)}`).at).toBe(storyToU(l.swapAt!))
    }
  })

  it('does not overlap one decode with the next', () => {
    for (let i = 1; i < chirps.length; i++) {
      expect(chirps[i].at - chirps[i - 1].at).toBeGreaterThan(storyToU(SCRAMBLE_SPAN))
    }
  })

  it('confirms when the final table has typed', () => {
    const done = LINES.find((l) => l.text.startsWith('mechanics recovered:'))!
    expect(done).toBeDefined()
    expect(cue('recovered').at).toBeCloseTo(storyToU(done.start + done.span), 10)
    expect(cue('recovered').at).toBeLessThan(STORY_END)
  })

  it('shuts down at the start of the shutdown, with a pip near the very end', () => {
    expect(cue('shutdown').at).toBe(SHUTDOWN[0])
    expect(cue('shutdown:pip').at).toBe(PIP_AT)
    expect(PIP_AT).toBeGreaterThan(SHUTDOWN[0])
    expect(PIP_AT).toBeGreaterThan(0.95)
    expect(PIP_AT).toBeLessThanOrEqual(SHUTDOWN[1])
  })

  it('plays nothing after the shutdown starts except the pip', () => {
    const after = sound.cues.filter((c) => c.at > SHUTDOWN[0])
    expect(after.map((c) => c.name)).toEqual(['shutdown:pip'])
    // And all the typing and decoding is over before it.
    for (const c of [...ticks, ...chirps]) expect(c.at).toBeLessThan(SHUTDOWN[0])
  })

  it('falls from a high whine to a very low one at the shutdown', () => {
    const { voice, played } = recordVoice()
    cue('shutdown').play(voice)
    const falls = played.filter((p) => p.kind === 'tone' && (p.spec.to ?? Infinity) <= 80)
    expect(falls.some((p) => p.spec.freq >= 2000)).toBe(true)
    expect(played.some((p) => p.kind === 'tone' && p.spec.freq < 120)).toBe(true) // the thump
  })

  it('marks the typing ticks and decode chirps continuous, and the rest one-shots', () => {
    for (const c of sound.cues) {
      const continuous = c.name.startsWith('tick:') || c.name.startsWith('decode:')
      expect(c.continuous === true, c.name).toBe(continuous)
    }
  })

  it('makes hex ticks lighter and prompt ticks crisper than a note tick', () => {
    const hex = tickFor(
      LINES.find((l) => l.to !== undefined)!,
      0,
    )
    const note = tickFor(
      LINES.find((l) => l.text.startsWith(';'))!,
      0,
    )
    const prompt = tickFor(
      LINES.find((l) => l.text.startsWith('$ rea'))!,
      0,
    )
    expect(hex.noise.gain).toBeLessThan(note.noise.gain)
    expect(note.noise.gain).toBeLessThan(prompt.noise.gain)
    expect(prompt.noise.freq).toBeGreaterThan(note.noise.freq)
  })

  it('plays only well-formed, quiet notes', () => {
    for (const c of sound.cues) {
      const { voice, played } = recordVoice()
      c.play(voice)
      expect(played.length, c.name).toBeGreaterThan(0)
      for (const p of played) {
        expect(specProblem(p.spec), c.name).toBeNull()
        expect(p.spec.gain, c.name).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('has a quiet bed that starts with the hum', () => {
    expect(sound.bed.layers[0].source).not.toBe('noise')
    const total = sound.bed.layers.reduce((a, l) => a + l.gain, 0)
    expect(total).toBeLessThan(0.05)
  })
})
