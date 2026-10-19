import { beats } from './beats'
import { assembleAmount, TV_COUNT, warmAmount } from './layout'

/** Floats per set in the glass state buffer: warm, scramble, lock, set index. */
export const STATE_STRIDE = 4

const scratch = { scramble: 0, lock: 0 }

/**
 * Writes every set's mask for progress `u`: `state` gets warm, scramble, lock and the set
 * index; `glow` gets how lit each cabinet is (a mix of its own screen and the room, which the
 * screens light together). With reduced motion the sets are simply on once `hold` is over.
 * Allocation-free.
 */
export function fillGlassState(
  u: number,
  reduced: boolean,
  state: Float32Array,
  glow: Float32Array,
) {
  let sum = 0
  for (let i = 0; i < TV_COUNT; i++) {
    const warm = reduced ? (u >= beats.ranges.hold[1] ? 1 : 0) : warmAmount(i, u)
    assembleAmount(i, u, scratch)
    const o = i * STATE_STRIDE
    state[o] = warm
    state[o + 1] = scratch.scramble
    state[o + 2] = scratch.lock
    state[o + 3] = i
    glow[i] = warm
    sum += warm
  }
  const mean = sum / TV_COUNT
  for (let i = 0; i < TV_COUNT; i++) glow[i] = 0.5 * glow[i] + 0.5 * mean
}
