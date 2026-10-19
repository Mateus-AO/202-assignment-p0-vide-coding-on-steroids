import { describe, expect, it } from 'vitest'
import { recordVoice, specProblem } from '@/utils/audio/recordVoice'
import { beats } from './beats'
import { sound } from './sound'

const cue = (name: string) => sound.cues.find((c) => c.name === name)

describe('voxel sound', () => {
  it('lights the fuse as the creature ignites and explodes on the blast', () => {
    expect(cue('fuse')?.at).toBe(beats.ranges.hiss[0])
    expect(cue('blast')?.at).toBe(beats.ranges.blast[0])
  })

  it('keeps the blast a one-shot, so reduced motion still hears it once', () => {
    expect(cue('blast')?.continuous).toBeFalsy()
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
