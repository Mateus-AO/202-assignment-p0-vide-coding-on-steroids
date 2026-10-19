import type { AudioEngine } from '@/utils/audio'

/**
 * Unlocks the engine, then enables it and runs `whenRunning`. Resolves true once output is
 * heard. If `cancelled()` becomes true while `unlock()` is still waiting on a refused or slow
 * `resume()`, the rest is skipped: a stale start must never un-mute a toggle that was turned
 * off in the meantime.
 */
export async function startOnceRunning(
  engine: AudioEngine,
  cancelled: () => boolean,
  whenRunning: () => void,
): Promise<boolean> {
  if (!(await engine.unlock()) || cancelled()) return false
  engine.setEnabled(true)
  whenRunning()
  return engine.running
}
