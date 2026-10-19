import { clampGain } from './limits'
import type { NoiseSpec, ToneSpec, Voice } from './voices'

/** A Voice that records what a cue would play, for tests. */
export function recordVoice() {
  const played: { kind: 'tone' | 'noise'; spec: ToneSpec | NoiseSpec }[] = []
  const voice: Voice = {
    tone: (spec) => void played.push({ kind: 'tone', spec }),
    noise: (spec) => void played.push({ kind: 'noise', spec }),
  }
  return { voice, played }
}

/** Why a spec would misbehave (silent, endless or out of range), or null if it is fine. */
export function specProblem(spec: ToneSpec | NoiseSpec) {
  if (!(spec.freq > 0)) return 'freq must be > 0'
  if (spec.to !== undefined && !(spec.to > 0)) return 'glide target must be > 0'
  if (!(spec.decay > 0 && spec.decay <= 3)) return 'decay must be in (0, 3] s'
  if (!(spec.gain > 0) || clampGain(spec.gain) !== spec.gain)
    return 'gain must be in (0, 1]'
  return null
}
