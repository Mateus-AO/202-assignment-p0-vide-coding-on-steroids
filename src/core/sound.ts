import type { BedSpec, Voice } from '@/utils/audio'

/** A sound tied to one moment of a world's progress. Fires when that moment is crossed forward. */
export type SoundCue = {
  /** Local progress at which it plays, in [0, 1]. */
  at: number
  name: string
  play: (voice: Voice) => void
  /**
   * Part of a continuous, progress-coupled sound (footsteps, rally hits). Skipped in reduced
   * motion, where progress jumps in big steps and would fire them in bursts.
   */
  continuous?: boolean
}

/** A world's sound: a quiet ambient bed plus its cues. Declared in the world's `sound.ts`. */
export type WorldSound = { bed: BedSpec; cues: readonly SoundCue[] }

/** Checks cue times and sorts the cues by time. */
export function defineSound({ bed, cues }: WorldSound): WorldSound {
  for (const c of cues) {
    if (!(c.at >= 0 && c.at <= 1)) {
      throw new Error(`sound cue "${c.name}" must be at progress in [0, 1], got ${c.at}`)
    }
  }
  if (bed.layers.length === 0) throw new Error('a sound bed needs at least one layer')
  return { bed, cues: [...cues].sort((a, b) => a.at - b.at) }
}
