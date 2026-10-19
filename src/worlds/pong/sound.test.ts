import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { beats } from './beats'
import { HITS } from './rally'
import { sound } from './sound'

const at = (name: string) => sound.cues.find((c) => c.name === name)?.at

describe('pong sound', () => {
  it('plays a hit at every rally contact after the serve', () => {
    const hits = sound.cues.filter((c) => c.name.startsWith('hit:'))
    expect(hits.map((c) => c.at)).toEqual(HITS.filter((h) => h.u > 0).map((h) => h.u))
  })

  it('treats paddle and wall hits as continuous, the block hits as one-shots', () => {
    for (const c of sound.cues.filter((c) => c.name.startsWith('hit:'))) {
      expect(c.continuous).toBe(!c.name.startsWith('hit:block'))
    }
  })

  it('cracks, shatters and whooshes on their beats', () => {
    expect(at('crack')).toBe(beats.ranges.crack[0])
    expect(at('shatter')).toBe(beats.ranges.shatter[0])
    expect(at('whoosh')).toBe(beats.ranges.blend[0])
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
