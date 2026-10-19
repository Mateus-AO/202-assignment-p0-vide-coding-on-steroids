import { describe, expect, it } from 'vitest'
import { CAPTION_THEME_IDS } from '@/core/captionTheme'
import {
  GLITCH_MS,
  GLITCH_PERIOD_MS,
  GLITCH_STEP_MS,
  MAX_FLASHES_PER_SECOND,
  PULSES_PER_CYCLE,
  START_LOOK,
  corrupt,
  cycleAt,
  flashPulsesPerSecond,
  glitchAt,
  lookIndexAt,
  newGlitchState,
} from './glitch'

const n = CAPTION_THEME_IDS.length
const idAt = (t: number) => CAPTION_THEME_IDS[lookIndexAt(t)]

describe('look sequence', () => {
  it('starts on the arena look and holds it through the quiet first cycle', () => {
    expect(CAPTION_THEME_IDS[START_LOOK]).toBe('arena')
    for (let t = 0; t < GLITCH_PERIOD_MS; t += 50) expect(idAt(t)).toBe('arena')
  })

  it('cycles in world order: pong, voxel, platformer, terminal, wall, arena, repeat', () => {
    const settled = (k: number) => idAt(k * GLITCH_PERIOD_MS + GLITCH_MS + 10)
    const seen = Array.from({ length: 2 * n }, (_, i) => settled(i + 1))
    expect(seen.slice(0, n)).toEqual([...CAPTION_THEME_IDS])
    expect(seen.slice(n)).toEqual(seen.slice(0, n))
  })

  it('shows a different look after every glitch', () => {
    for (let k = 1; k < 20; k++) {
      const before = lookIndexAt(k * GLITCH_PERIOD_MS - 5)
      const after = lookIndexAt(k * GLITCH_PERIOD_MS + GLITCH_MS)
      expect(after).not.toBe(before)
    }
  })

  it('changes the look only inside a glitch', () => {
    let last = lookIndexAt(0)
    const state = newGlitchState()
    for (let t = 0; t < 10 * GLITCH_PERIOD_MS; t += 5) {
      const now = lookIndexAt(t)
      if (now !== last) expect(glitchAt(t, state).active).toBe(true)
      last = now
    }
  })

  it('is a fixed sequence', () => {
    expect(idAt(2 * GLITCH_PERIOD_MS + 500)).toBe('voxel')
    expect(idAt(3 * GLITCH_PERIOD_MS + 500)).toBe('platformer')
    expect(idAt(7 * GLITCH_PERIOD_MS + 500)).toBe('pong')
  })
})

describe('glitch envelope', () => {
  const state = newGlitchState()

  it('lasts between 150 and 250 ms and then stops', () => {
    expect(GLITCH_MS).toBeGreaterThanOrEqual(150)
    expect(GLITCH_MS).toBeLessThanOrEqual(250)
    const k = 3 * GLITCH_PERIOD_MS
    expect(glitchAt(k - 1, state).active).toBe(false)
    expect(glitchAt(k + 1, state).active).toBe(true)
    expect(glitchAt(k + GLITCH_MS - 1, state).active).toBe(true)
    expect(glitchAt(k + GLITCH_MS, state).active).toBe(false)
  })

  it('has no glitch in the quiet first cycle', () => {
    for (let t = 0; t < GLITCH_PERIOD_MS; t += 10) {
      expect(glitchAt(t, state).active).toBe(false)
    }
  })

  it('rises and falls once, within (0, 1]', () => {
    const k = 2 * GLITCH_PERIOD_MS
    let peaks = 0
    let prev = 0
    let rising = true
    for (let t = k; t < k + GLITCH_MS; t++) {
      const a = glitchAt(t, state).amount
      expect(a).toBeGreaterThan(0)
      expect(a).toBeLessThanOrEqual(1)
      if (rising && a < prev - 1e-9) {
        peaks++
        rising = false
      }
      if (!rising && a > prev + 1e-9) peaks = 99
      prev = a
    }
    expect(peaks).toBe(1)
  })

  it('is deterministic and varies its pattern step by step', () => {
    const k = 4 * GLITCH_PERIOD_MS
    const a = { ...glitchAt(k + 10, state) }
    const b = { ...glitchAt(k + 10, state) }
    expect(a).toEqual(b)
    const shakes = new Set<number>()
    for (let s = 0; s < GLITCH_MS / GLITCH_STEP_MS; s++) {
      const g = glitchAt(k + s * GLITCH_STEP_MS + 1, state)
      expect(Math.abs(g.shake)).toBeLessThanOrEqual(1)
      expect(g.clipTop + g.clipBottom).toBeLessThan(1)
      shakes.add(g.shake)
    }
    expect(shakes.size).toBeGreaterThan(2)
  })
})

describe('flash safety', () => {
  it('stays within 2.5 pulses per second', () => {
    expect(flashPulsesPerSecond()).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND)
    expect(flashPulsesPerSecond()).toBe((PULSES_PER_CYCLE * 1000) / GLITCH_PERIOD_MS)
  })

  it('counts the real events: at most 2.5 glitch starts and look changes in any 1 s', () => {
    const state = newGlitchState()
    const events: number[] = []
    let last = lookIndexAt(0)
    let wasActive = false
    for (let t = 0; t < 60_000; t += 5) {
      const active = glitchAt(t, state).active
      if (active && !wasActive) events.push(t)
      wasActive = active
      const now = lookIndexAt(t)
      if (now !== last) events.push(t)
      last = now
    }
    expect(events.length).toBeGreaterThan(0)
    for (const start of events) {
      const inWindow = events.filter((e) => e >= start && e < start + 1000)
      expect(inWindow.length).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND)
    }
  })

  it('cycles are whole numbers', () => {
    expect(cycleAt(0)).toBe(0)
    expect(cycleAt(GLITCH_PERIOD_MS * 2.5)).toBe(2)
    expect(cycleAt(-5)).toBe(0)
  })
})

describe('corrupt', () => {
  const text = 'You can merge anything'
  it('leaves the text alone at 0 and keeps length, spaces and punctuation', () => {
    expect(corrupt(text, 0, 1, 1)).toBe(text)
    const out = corrupt('a-b c.d', 1, 5, 2)
    expect(out).toHaveLength(7)
    expect(out[1]).toBe('-')
    expect(out[3]).toBe(' ')
    expect(out[5]).toBe('.')
  })
  it('is deterministic and actually changes something at full strength', () => {
    const a = corrupt(text, 1, 3, 2)
    expect(a).toBe(corrupt(text, 1, 3, 2))
    expect(a).toHaveLength(text.length)
    let changed = 0
    for (let step = 0; step < 4; step++) if (corrupt(text, 1, 3, step) !== text) changed++
    expect(changed).toBeGreaterThan(0)
  })
})
