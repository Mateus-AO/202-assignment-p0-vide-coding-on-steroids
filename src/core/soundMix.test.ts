import { describe, expect, it } from 'vitest'
import { createPicker, pickedCount } from '@/utils/audio'
import { defineSound, type SoundCue } from './sound'
import { bedLevelsInto, pickCuesInto } from './soundMix'
import type { WorldModule } from './world'

const cue = (at: number, name: string, continuous = false): SoundCue => ({
  at,
  name,
  continuous,
  play: () => {},
})
const bed = { layers: [{ source: 'sine' as const, gain: 0.1 }] }

const world = (
  id: string,
  cues: SoundCue[],
  exit?: WorldModule['exit'],
): WorldModule => ({
  id,
  Scene: () => null,
  cameraPath: (u) => ({ position: [u, 0, 0], target: [u, 0, -1] }),
  exit,
  captions: [],
  sound: defineSound({ bed, cues }),
})

const worlds = [
  world('a', [cue(0.2, 'a1'), cue(0.5, 'a-step', true), cue(0.9, 'a2')], {
    kind: 'portal',
    position: [1, 0, 0],
    size: [2, 2],
    openAt: 0.5,
    blendRange: [0.6, 0.8],
  }),
  world('b', [cue(0, 'b0'), cue(0.5, 'b1')], {
    kind: 'cover',
    whiteFrom: 0.8,
    whiteFull: 0.9,
    revealLength: 0.4,
  }),
  world('c', [cue(0.1, 'c1')]),
]

const names = (
  from: [number, number],
  to: [number, number],
  reduced = false,
  max = 10,
) => {
  const p = createPicker<SoundCue>(max)
  const n = pickCuesInto(
    worlds,
    { index: from[0], u: from[1] },
    { index: to[0], u: to[1] },
    p,
    { reduced },
  )
  expect(n).toBe(pickedCount(p))
  return p.items.slice(0, n).map((c) => c.name)
}

describe('pickCuesInto', () => {
  it('fires the cues crossed going forward within a world', () => {
    expect(names([0, 0.1], [0, 0.6])).toEqual(['a1', 'a-step'])
  })

  it('is silent going backward, also across a handoff', () => {
    expect(names([0, 0.6], [0, 0.1])).toEqual([])
    expect(names([1, 0.3], [0, 0.95])).toEqual([])
  })

  it('crosses a handoff forward: the end of the old world, then the start of the new', () => {
    expect(names([0, 0.85], [1, 0.6])).toEqual(['a2', 'b0', 'b1'])
  })

  it('is silent on a jump over a whole world', () => {
    expect(names([0, 0.1], [2, 0.5])).toEqual([])
  })

  it('skips continuous cues in reduced motion', () => {
    expect(names([0, 0], [0, 1], true)).toEqual(['a1', 'a2'])
  })

  it('caps a burst to the latest cues', () => {
    expect(names([0, 0], [0, 1], false, 2).sort()).toEqual(['a-step', 'a2'])
  })
})

describe('bedLevelsInto', () => {
  const levels = (index: number, u: number) => bedLevelsInto(worlds, index, u, [])

  it('plays only the active world before any exit', () => {
    expect(levels(0, 0.3)).toEqual([1, 0, 0])
  })

  it('crossfades into the next world over a portal blend', () => {
    const mid = levels(0, 0.7)
    expect(mid[0]).toBeCloseTo(0.5)
    expect(mid[1]).toBeCloseTo(0.5)
    expect(levels(0, 0.8)).toEqual([0, 1, 0])
  })

  it('fades out under a cover and back in as it clears', () => {
    expect(levels(1, 0.95)[1]).toBe(0)
    expect(levels(2, 0)[2]).toBe(0)
    expect(levels(2, 0.2)[2]).toBeCloseTo(0.5)
    expect(levels(2, 0.5)).toEqual([0, 0, 1])
  })

  it('never goes above 1 or below 0', () => {
    for (let i = 0; i < worlds.length; i++) {
      for (let u = 0; u <= 1; u += 0.01) {
        for (const l of levels(i, u)) expect(l >= 0 && l <= 1).toBe(true)
      }
    }
  })
})

describe('defineSound', () => {
  it('sorts cues and rejects times outside [0, 1]', () => {
    const s = defineSound({ bed, cues: [cue(0.5, 'b'), cue(0.1, 'a')] })
    expect(s.cues.map((c) => c.name)).toEqual(['a', 'b'])
    expect(() => defineSound({ bed, cues: [cue(1.2, 'x')] })).toThrow(/x/)
    expect(() => defineSound({ bed: { layers: [] }, cues: [] })).toThrow()
  })
})
