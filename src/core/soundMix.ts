import { pickCrossed, resetPicker, pickedCount, type Picker } from '@/utils/audio'
import { smoothstep } from '@/utils/math'
import type { SoundCue } from './sound'
import type { WorldModule } from './world'

/** Where the scroll was: active world and its local progress. */
export type Cursor = { index: number; u: number }

const isContinuous = (cue: SoundCue) => cue.continuous === true

/**
 * The cues to play for a move from `from` to `to`, into `picker` (latest `picker.max` kept).
 * Only forward moves play: within a world, or into the very next one (the rest of the old world,
 * then the start of the new). Backward moves and jumps over a whole world are silent.
 * Returns how many were picked.
 */
export function pickCuesInto(
  worlds: readonly WorldModule[],
  from: Cursor,
  to: Cursor,
  picker: Picker<SoundCue>,
  { reduced = false }: { reduced?: boolean } = {},
) {
  resetPicker(picker)
  const skip = reduced ? isContinuous : undefined
  const cues = (i: number) => worlds[i]?.sound?.cues ?? []
  if (to.index === from.index) {
    pickCrossed(cues(to.index), from.u, to.u, picker, skip)
  } else if (to.index === from.index + 1) {
    pickCrossed(cues(from.index), from.u, 1, picker, skip)
    pickCrossed(cues(to.index), -1, to.u, picker, skip)
  }
  return pickedCount(picker)
}

/**
 * Ambient bed level of every world at this moment, into `out` (one entry per world). The
 * active world's bed is full; at a portal exit it crossfades into the next world's bed over the
 * blend, at a cover exit it fades out as the white spreads and the next one fades in as the
 * cover clears.
 */
export function bedLevelsInto(
  worlds: readonly WorldModule[],
  index: number,
  u: number,
  out: number[],
) {
  for (let i = 0; i < worlds.length; i++) out[i] = 0
  out.length = worlds.length
  const exit = worlds[index].exit
  let level = 1

  if (exit?.kind === 'portal' && index + 1 < worlds.length) {
    const blend = smoothstep(exit.blendRange[0], exit.blendRange[1], u)
    level = 1 - blend
    out[index + 1] = blend
  } else if (exit?.kind === 'cover') {
    level = 1 - smoothstep(exit.whiteFrom, exit.whiteFull, u)
  }

  const previous = worlds[index - 1]?.exit
  if (previous?.kind === 'cover') level *= smoothstep(0, previous.revealLength, u)

  out[index] = level
  return out
}
