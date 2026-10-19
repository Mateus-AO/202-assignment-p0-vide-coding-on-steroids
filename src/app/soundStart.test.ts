import { describe, expect, it } from 'vitest'
import type { AudioEngine } from '@/utils/audio'
import { startOnceRunning } from './soundStart'

/** An engine whose `unlock` resolves whenever the test says, with a spied `setEnabled`. */
function fakeEngine({ unlocked = true, running = true } = {}) {
  const calls: boolean[] = []
  const engine = {
    unlock: async () => unlocked,
    unlocked,
    running,
    setEnabled: (on: boolean) => calls.push(on),
    active: false,
    voice: { tone: () => {}, noise: () => {} },
    createBed: () => null,
  } as AudioEngine
  return { engine, calls }
}

const never = () => false
const yes = () => true

describe('startOnceRunning', () => {
  it('enables the engine and runs the callback once the context is running', async () => {
    const { engine, calls } = fakeEngine()
    let ran = 0
    await expect(startOnceRunning(engine, never, () => ran++)).resolves.toBe(true)
    expect(calls).toEqual([true])
    expect(ran).toBe(1)
  })

  it('does nothing when cancelled before the unlock resolves', async () => {
    let cancelled = false
    const { engine, calls } = fakeEngine()
    let ran = 0
    const started = startOnceRunning(
      engine,
      () => cancelled,
      () => ran++,
    )
    cancelled = true // the toggle was turned off while unlock() was still pending
    await expect(started).resolves.toBe(false)
    expect(calls).toEqual([])
    expect(ran).toBe(0)
  })

  it('leaves a refused unlock alone and stays silent', async () => {
    const { engine, calls } = fakeEngine({ unlocked: false, running: false })
    let ran = 0
    await expect(startOnceRunning(engine, never, () => ran++)).resolves.toBe(false)
    expect(calls).toEqual([])
    expect(ran).toBe(0)
  })

  it('reports the engine state after enabling (false if it dropped back to suspended)', async () => {
    const { engine } = fakeEngine({ running: false })
    await expect(startOnceRunning(engine, never, yes)).resolves.toBe(false)
  })
})
