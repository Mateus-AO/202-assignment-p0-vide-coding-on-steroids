import { describe, expect, it } from 'vitest'
import { createAudioEngine } from './engine'
import { clampGain, hardClipCurve, OUTPUT_CEILING } from './limits'
import { envelopeTimes } from './voices'

/**
 * Just enough of an AudioContext to record the graph. `state` starts 'suspended' unless the
 * context is made `running`; `resume()` resolves once `state` is 'running' — pass a
 * `resume` stub to model a browser that refuses.
 */
function fakeContext({
  running = false,
  resume,
}: { running?: boolean; resume?: () => Promise<void> } = {}) {
  const nodes: { kind: string; node: Record<string, unknown> }[] = []
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  })
  const node = (kind: string, extra: Record<string, unknown> = {}) => {
    const n: Record<string, unknown> = {
      connect: (to: unknown) => to,
      disconnect() {},
      start() {},
      stop() {},
      ...extra,
    }
    nodes.push({ kind, node: n })
    return n
  }
  const ctx = {
    state: running ? 'running' : 'suspended',
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    resume:
      resume ??
      (async () => {
        ctx.state = 'running'
      }),
    suspend: async () => {
      ctx.state = 'suspended'
    },
    createGain: () => node('gain', { gain: param() }),
    createDynamicsCompressor: () =>
      node('compressor', {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
      }),
    createWaveShaper: () => node('shaper'),
    createOscillator: () => node('osc', { frequency: param() }),
    createBiquadFilter: () => node('filter', { frequency: param(), Q: param() }),
    createBufferSource: () => node('source'),
    createBuffer: (_c: number, length: number) => ({
      duration: 1,
      getChannelData: () => new Float32Array(length),
    }),
  }
  return { ctx: ctx as unknown as AudioContext, raw: ctx as { state: string }, nodes }
}

const TONE = { freq: 440, decay: 0.1, gain: 0.5 }

describe('audio engine', () => {
  it('creates no context and plays nothing before unlock', () => {
    let made = 0
    const engine = createAudioEngine({
      createContext: () => {
        made++
        return fakeContext({ running: true }).ctx
      },
    })
    engine.setEnabled(true)
    engine.voice.tone(TONE)
    expect(made).toBe(0)
    expect(engine.active).toBe(false)
    expect(engine.running).toBe(false)
    expect(engine.createBed({ layers: [{ source: 'sine', gain: 0.1 }] })).toBeNull()
  })

  it('caps the final gain at the ceiling, however high it is asked to be', async () => {
    const { ctx, nodes } = fakeContext()
    const engine = createAudioEngine({ ceiling: 5, createContext: () => ctx })
    expect(await engine.unlock()).toBe(true)
    const gains = nodes.filter((n) => n.kind === 'gain')
    const out = gains[gains.length - 1].node.gain as { value: number }
    expect(out.value).toBe(OUTPUT_CEILING)
    expect(nodes.some((n) => n.kind === 'shaper')).toBe(true)
  })

  it('is silent while off and plays once enabled and running', async () => {
    const { ctx, nodes } = fakeContext()
    const engine = createAudioEngine({ createContext: () => ctx })
    await engine.unlock()
    const before = nodes.length
    engine.voice.tone(TONE)
    expect(nodes.length).toBe(before)
    engine.setEnabled(true)
    expect(engine.active).toBe(true)
    expect(engine.running).toBe(true)
    engine.voice.tone(TONE)
    expect(nodes.length).toBeGreaterThan(before)
  })

  it('unlocks once and reports failure when Web Audio is missing', async () => {
    let made = 0
    const engine = createAudioEngine({
      createContext: () => {
        made++
        return fakeContext().ctx
      },
    })
    await engine.unlock()
    await engine.unlock()
    expect(made).toBe(1)
    const broken = createAudioEngine({
      createContext: () => {
        throw new Error('no audio')
      },
    })
    expect(await broken.unlock()).toBe(false)
    expect(broken.unlocked).toBe(false)
  })

  it('resolves unlock only once the context is running', async () => {
    let allowed = false
    const { ctx, raw } = fakeContext({
      resume: async () => {
        if (!allowed) await new Promise(() => {}) // a refused gesture never resolves
        raw.state = 'running'
      },
    })
    const engine = createAudioEngine({ createContext: () => ctx })
    let resolved = false
    const first = engine.unlock().then((ok) => (resolved = ok))
    await Promise.resolve()
    expect(resolved).toBe(false) // still waiting: the browser has not run the context
    expect(engine.unlocked).toBe(true)
    expect(engine.running).toBe(false)
    void first
    // A later, accepted gesture resumes it.
    allowed = true
    raw.state = 'running'
    expect(await engine.unlock()).toBe(true)
    expect(engine.running).toBe(true)
  })

  it('returns false from unlock when resume rejects, and stays silent while suspended', async () => {
    const { ctx, nodes } = fakeContext({
      resume: async () => {
        throw new Error('interrupted')
      },
    })
    const engine = createAudioEngine({ createContext: () => ctx })
    expect(await engine.unlock()).toBe(false)
    expect(engine.running).toBe(false)
    // Even enabled, a suspended context schedules no notes: no burst when it wakes.
    engine.setEnabled(true)
    const before = nodes.length
    engine.voice.tone(TONE)
    expect(nodes.length).toBe(before)
    expect(engine.active).toBe(false)
  })
})

describe('limits', () => {
  it('keeps the ceiling well below full scale', () => {
    expect(OUTPUT_CEILING).toBeGreaterThan(0)
    expect(OUTPUT_CEILING).toBeLessThanOrEqual(0.5)
  })

  it('clamps gains into [0, 1]', () => {
    expect(clampGain(3)).toBe(1)
    expect(clampGain(-1)).toBe(0)
    expect(clampGain(NaN)).toBe(0)
    expect(clampGain(0.4)).toBe(0.4)
  })

  it('hard-clips at full scale', () => {
    expect(Array.from(hardClipCurve())).toEqual([-1, 1])
  })

  it('times envelopes after the delay, with a positive attack and decay', () => {
    const t = envelopeTimes({ decay: 0.2, delay: 0.1 }, 1)
    expect(t.start).toBeCloseTo(1.1)
    expect(t.peak).toBeGreaterThan(t.start)
    expect(t.end).toBeCloseTo(t.peak + 0.2)
  })
})
