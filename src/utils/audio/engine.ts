import { createBed, type Bed, type BedSpec } from './bed'
import { clampGain, hardClipCurve, OUTPUT_CEILING } from './limits'
import { createNoiseBuffer, playNoise, playTone, type Voice } from './voices'

/** Seconds for the on/off fade. */
const FADE = 0.06
/** After turning off, suspend the context once the fade is done, so it costs no CPU. */
const SUSPEND_AFTER_MS = 500

export type AudioEngine = {
  /**
   * Creates (or resumes) the AudioContext. Browsers only allow this inside a click, tap or key
   * handler. Resolves true once the context is `running` — it stays pending while the browser
   * keeps refusing `resume`, so callers can wait for it or simply try again on the next gesture.
   * False if the browser has no Web Audio.
   */
  unlock: () => Promise<boolean>
  /** True once `unlock` has created a context. */
  readonly unlocked: boolean
  /** The context exists and is `running`: output is heard. */
  readonly running: boolean
  /** Fades all output in or out. Off by default. */
  setEnabled: (on: boolean) => void
  /** Enabled and running: cues will be heard. */
  readonly active: boolean
  /** Plays short notes and bursts. Does nothing (allocates nothing) while not active. */
  readonly voice: Voice
  /** A sustained ambient bed, silent until its level is raised. Null before `unlock`. */
  createBed: (spec: BedSpec, maxLayers?: number) => Bed | null
}

type Options = {
  /** Peak output in [0, 1]; values above `OUTPUT_CEILING` are lowered to it. */
  ceiling?: number
  createContext?: () => AudioContext
}

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }

const browserContext = () => {
  const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext
  return new Ctor()
}

type Graph = { ctx: AudioContext; input: GainNode; noise: AudioBuffer }

/**
 * Builds the output chain: input (on/off fade) → limiter → hard clip at full scale → ceiling.
 * The clip and the final gain together guarantee the output never exceeds `ceiling`.
 */
function buildGraph(ctx: AudioContext, ceiling: number): Graph {
  const input = ctx.createGain()
  input.gain.value = 0

  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -10
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.15

  const clip = ctx.createWaveShaper()
  clip.curve = hardClipCurve()

  const out = ctx.createGain()
  out.gain.value = ceiling

  input.connect(limiter).connect(clip).connect(out).connect(ctx.destination)
  return { ctx, input, noise: createNoiseBuffer(ctx) }
}

/**
 * A small synthesized-audio engine. Creating it touches no browser API; the context is only
 * made on `unlock`, so sound can never start before the user asks for it.
 */
export function createAudioEngine({
  ceiling = OUTPUT_CEILING,
  createContext = browserContext,
}: Options = {}): AudioEngine {
  const peak = Math.min(OUTPUT_CEILING, clampGain(ceiling))
  let graph: Graph | null = null
  let enabled = false
  let suspendTimer: ReturnType<typeof setTimeout> | undefined

  // Only a running context may schedule notes: a suspended one has a frozen clock, so cues
  // fired while it sleeps would all land at the same start and burst when it wakes.
  const live = () => (enabled && graph && graph.ctx.state === 'running' ? graph : null)

  const voice: Voice = {
    tone: (spec) => {
      const g = live()
      if (g) playTone(g.ctx, g.input, spec)
    },
    noise: (spec) => {
      const g = live()
      if (g) playNoise(g.ctx, g.input, g.noise, spec)
    },
  }

  return {
    async unlock() {
      try {
        graph ??= buildGraph(createContext(), peak)
      } catch {
        return false
      }
      if (graph.ctx.state === 'suspended') {
        try {
          await graph.ctx.resume()
        } catch {
          return false
        }
      }
      return graph.ctx.state === 'running'
    },
    get unlocked() {
      return graph !== null
    },
    get running() {
      return graph?.ctx.state === 'running'
    },
    setEnabled(on) {
      enabled = on
      if (!graph) return
      const { ctx, input } = graph
      clearTimeout(suspendTimer)
      if (on && ctx.state === 'suspended') void ctx.resume().catch(() => {})
      input.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, FADE)
      if (!on) {
        suspendTimer = setTimeout(() => {
          if (!enabled) void ctx.suspend().catch(() => {})
        }, SUSPEND_AFTER_MS)
      }
    },
    get active() {
      return enabled && graph?.ctx.state === 'running'
    },
    voice,
    createBed(spec, maxLayers) {
      return graph
        ? createBed(graph.ctx, graph.input, graph.noise, spec, maxLayers)
        : null
    },
  }
}
