import type { Frame } from '@/core/timeline'
import type { SoundCue } from '@/core/sound'
import { bedLevelsInto, pickCuesInto, type Cursor } from '@/core/soundMix'
import { createPicker, type AudioEngine, type Bed } from '@/utils/audio'
import type { QualityTier } from '@/utils/three/quality'
import { worlds } from './worlds'

/** A fast fling plays at most this many cues in one frame (the latest ones). */
const MAX_CUES_PER_FRAME = 3

/**
 * Drives the engine from the current Frame: one-shot and continuous cues for the progress
 * crossed since the last frame, and the ambient beds' crossfade. Nothing is allocated per frame.
 */
export function createSoundDirector(engine: AudioEngine, quality: QualityTier) {
  const picker = createPicker<SoundCue>(MAX_CUES_PER_FRAME)
  const levels: number[] = worlds.map(() => 0)
  const last: Cursor = { index: 0, u: 0 }
  let beds: (Bed | null)[] | null = null

  const remember = (frame: Frame) => {
    last.index = frame.index
    last.u = frame.u
  }

  return {
    /** Forget the last position, so nothing fires for what was scrolled while silent. */
    reset: remember,
    update(frame: Frame, reduced: boolean) {
      if (!engine.active) return remember(frame)
      beds ??= worlds.map((w) =>
        w.sound ? engine.createBed(w.sound.bed, quality === 'low' ? 1 : undefined) : null,
      )
      const n = pickCuesInto(worlds, last, frame, picker, { reduced })
      for (let i = 0; i < n; i++) picker.items[i].play(engine.voice)
      bedLevelsInto(worlds, frame.index, frame.u, levels)
      for (let i = 0; i < beds.length; i++) beds[i]?.setLevel(levels[i])
      remember(frame)
    },
  }
}
