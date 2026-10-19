import { clampGain } from './limits'

/** One sustained voice of an ambient bed. */
export type BedLayer = {
  /** An oscillator wave, or 'noise' for looping white noise. */
  source: Exclude<OscillatorType, 'custom'> | 'noise'
  /** Oscillator pitch in Hz (ignored for noise). */
  freq?: number
  filter?: { type: BiquadFilterType; freq: number; q?: number }
  gain: number
  /** A slow swell: rate in Hz, depth (at most 0.5) as a fraction of `gain`. */
  wobble?: { rate: number; depth: number }
}

/** A quiet sustained background. The first layer is the essential one (see `maxLayers`). */
export type BedSpec = { layers: readonly BedLayer[] }

export type Bed = {
  /** 0 = silent, 1 = full. Smoothed, so it can be called every frame. */
  setLevel: (level: number) => void
}

/** Seconds for a level change to get about two-thirds of the way. */
const LEVEL_SMOOTHING = 0.12

/** Builds and starts a bed, silent until `setLevel`. Runs until the context closes. */
export function createBed(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  spec: BedSpec,
  maxLayers = spec.layers.length,
): Bed {
  const level = ctx.createGain()
  level.gain.value = 0
  level.connect(out)

  for (const layer of spec.layers.slice(0, Math.max(1, maxLayers))) {
    const gain = ctx.createGain()
    gain.gain.value = clampGain(layer.gain)
    gain.connect(level)

    let src: AudioScheduledSourceNode
    if (layer.source === 'noise') {
      const s = ctx.createBufferSource()
      s.buffer = noise
      s.loop = true
      src = s
    } else {
      const o = ctx.createOscillator()
      o.type = layer.source
      o.frequency.value = layer.freq ?? 220
      src = o
    }

    let head: AudioNode = gain
    if (layer.filter) {
      const f = ctx.createBiquadFilter()
      f.type = layer.filter.type
      f.frequency.value = layer.filter.freq
      f.Q.value = layer.filter.q ?? 0.7
      f.connect(gain)
      head = f
    }
    src.connect(head)
    src.start()

    if (layer.wobble) {
      // The gain swings between peak * (1 - 2 * depth) and peak, never above peak.
      const peak = clampGain(layer.gain)
      const d = Math.min(0.5, clampGain(layer.wobble.depth))
      const lfo = ctx.createOscillator()
      const depth = ctx.createGain()
      lfo.frequency.value = layer.wobble.rate
      depth.gain.value = peak * d
      gain.gain.value = peak * (1 - d)
      lfo.connect(depth).connect(gain.gain)
      lfo.start()
    }
  }

  let last = 0
  return {
    setLevel(target) {
      const next = clampGain(target)
      if (Math.abs(next - last) < 0.001) return
      last = next
      level.gain.setTargetAtTime(next, ctx.currentTime, LEVEL_SMOOTHING)
    },
  }
}
