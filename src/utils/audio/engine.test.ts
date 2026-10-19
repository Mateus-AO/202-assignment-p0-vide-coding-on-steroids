import { describe, expect, it } from 'vitest'
import { createAudioEngine } from './engine'
import { clampGain, hardClipCurve, OUTPUT_CEILING } from './limits'
import { envelopeTimes } from './voices'

/** Just enough of an AudioContext to record the graph. */
function fakeContext() {
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
    state: 'running',
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    resume: async () => {},
    suspend: async () => {},
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
  return { ctx: ctx as unknown as AudioContext, nodes }
}

const TONE = { freq: 440, decay: 0.1, gain: 0.5 }

describe('audio engine', () => {
  it('creates no context and plays nothing before unlock', () => {
    let made = 0
    const engine = createAudioEngine({
      createContext: () => {
        made++
        return fakeContext().ctx
      },
    })
    engine.setEnabled(true)
    engine.voice.tone(TONE)
    expect(made).toBe(0)
    expect(engine.active).toBe(false)
    expect(engine.createBed({ layers: [{ source: 'sine', gain: 0.1 }] })).toBeNull()
  })

  it('caps the final gain at the ceiling, however high it is asked to be', () => {
    const { ctx, nodes } = fakeContext()
    const engine = createAudioEngine({ ceiling: 5, createContext: () => ctx })
    expect(engine.unlock()).toBe(true)
    const gains = nodes.filter((n) => n.kind === 'gain')
    const out = gains[gains.length - 1].node.gain as { value: number }
    expect(out.value).toBe(OUTPUT_CEILING)
    expect(nodes.some((n) => n.kind === 'shaper')).toBe(true)
  })

  it('is silent while off and plays once enabled', () => {
    const { ctx, nodes } = fakeContext()
    const engine = createAudioEngine({ createContext: () => ctx })
    engine.unlock()
    const before = nodes.length
    engine.voice.tone(TONE)
    expect(nodes.length).toBe(before)
    engine.setEnabled(true)
    expect(engine.active).toBe(true)
    engine.voice.tone(TONE)
    expect(nodes.length).toBeGreaterThan(before)
  })

  it('unlocks once and reports failure when Web Audio is missing', () => {
    let made = 0
    const engine = createAudioEngine({
      createContext: () => {
        made++
        return fakeContext().ctx
      },
    })
    engine.unlock()
    engine.unlock()
    expect(made).toBe(1)
    const broken = createAudioEngine({
      createContext: () => {
        throw new Error('no audio')
      },
    })
    expect(broken.unlock()).toBe(false)
    expect(broken.unlocked).toBe(false)
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
