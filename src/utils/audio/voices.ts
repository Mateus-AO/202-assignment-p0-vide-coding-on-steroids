import { clampGain } from './limits'

/** Silence level that exponential ramps decay to (they cannot reach 0). */
const FLOOR = 0.0001

/** A short oscillator note with an attack/decay envelope and an optional pitch glide. */
export type ToneSpec = {
  wave?: Exclude<OscillatorType, 'custom'>
  freq: number
  /** Glide to this frequency over the note. */
  to?: number
  attack?: number
  /** Seconds from the peak to silence. */
  decay: number
  gain: number
  /** Seconds to wait before the note starts. */
  delay?: number
}

/** A burst of filtered white noise with an envelope and an optional filter sweep. */
export type NoiseSpec = {
  filter?: BiquadFilterType
  /** Filter cutoff (or center), in Hz. */
  freq: number
  /** Sweep the filter to this frequency over the burst. */
  to?: number
  q?: number
  attack?: number
  decay: number
  gain: number
  delay?: number
}

/** What a cue may play. Silent (allocates nothing) while sound is off. */
export type Voice = {
  tone: (spec: ToneSpec) => void
  noise: (spec: NoiseSpec) => void
}

/** Start/peak/end times of a note's envelope, in context seconds. */
export function envelopeTimes(
  spec: { attack?: number; decay: number; delay?: number },
  now: number,
) {
  const start = now + Math.max(0, spec.delay ?? 0)
  const peak = start + Math.max(0.002, spec.attack ?? 0.004)
  return { start, peak, end: peak + Math.max(0.01, spec.decay) }
}

function envelope(ctx: BaseAudioContext, spec: ToneSpec | NoiseSpec) {
  const amp = ctx.createGain()
  const { start, peak, end } = envelopeTimes(spec, ctx.currentTime)
  amp.gain.setValueAtTime(0, start)
  amp.gain.linearRampToValueAtTime(Math.max(FLOOR, clampGain(spec.gain)), peak)
  amp.gain.exponentialRampToValueAtTime(FLOOR, end)
  return { amp, start, end }
}

const glide = (
  param: AudioParam,
  from: number,
  to: number | undefined,
  start: number,
  end: number,
) => {
  param.setValueAtTime(from, start)
  if (to !== undefined && to > 0) param.exponentialRampToValueAtTime(to, end)
}

export function playTone(ctx: BaseAudioContext, out: AudioNode, spec: ToneSpec) {
  const osc = ctx.createOscillator()
  const { amp, start, end } = envelope(ctx, spec)
  osc.type = spec.wave ?? 'square'
  glide(osc.frequency, spec.freq, spec.to, start, end)
  osc.connect(amp).connect(out)
  osc.start(start)
  osc.stop(end + 0.02)
  osc.onended = () => amp.disconnect()
}

export function playNoise(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  spec: NoiseSpec,
) {
  const src = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const { amp, start, end } = envelope(ctx, spec)
  src.buffer = noise
  src.loop = true
  filter.type = spec.filter ?? 'lowpass'
  filter.Q.value = spec.q ?? 1
  glide(filter.frequency, spec.freq, spec.to, start, end)
  src.connect(filter).connect(amp).connect(out)
  // Start somewhere random in the buffer so repeated bursts do not sound identical.
  src.start(start, Math.random() * noise.duration)
  src.stop(end + 0.02)
  src.onended = () => {
    filter.disconnect()
    amp.disconnect()
  }
}

/** One second of white noise; make it once per context and share it. */
export function createNoiseBuffer(ctx: BaseAudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}
