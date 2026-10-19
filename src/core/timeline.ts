import { clamp, smoothstep } from '@/utils/math'
import type { CoverPhase, CoverStyle } from '@/utils/transitions/ScreenMosaic'
import type { Caption, CameraPose, WorldModule } from './world'

/** In reduced-motion mode scroll still moves the story, but in this many fixed steps per world. */
export const REDUCED_STEPS_PER_WORLD = 4

export type Frame = {
  /** Overall progress after any reduced-motion snapping. */
  progress: number
  index: number
  /** Local progress of the active world in [0, 1]. */
  u: number
  world: WorldModule
  pose: (aspect: number) => CameraPose
  /** Present while the active world's exit is a portal. */
  portal: { open: boolean; blend: number } | null
  /** Full-screen cover state: covering the old world, or clearing over the new one. */
  cover: CoverPhase
  caption: Caption | undefined
}

const COVER_OFF: CoverPhase = { mode: 0, t: 0 }

/** A cover phase; the default `mosaic` style is left out so those frames stay as they were. */
const coverPhase = (mode: 1 | 2, t: number, style?: CoverStyle): CoverPhase =>
  style === 'black' ? { mode, t, style } : { mode, t }

/** Splits overall progress into the active world and its local progress. */
function split(progress: number, count: number) {
  const x = progress * count
  const index = Math.min(Math.floor(x), count - 1)
  return { index, u: clamp(x - index, 0, 1) }
}

/** Everything the page needs to draw one moment of the scroll. Pure: same input, same frame. */
export function frameAt(
  worlds: readonly WorldModule[],
  rawProgress: number,
  { reduced = false }: { reduced?: boolean } = {},
): Frame {
  const raw = clamp(rawProgress, 0, 1)
  const steps = REDUCED_STEPS_PER_WORLD * worlds.length
  const progress = reduced ? Math.round(raw * steps) / steps : raw
  const { index, u } = split(progress, worlds.length)
  const world = worlds[index]
  const exit = world.exit

  let cover = COVER_OFF
  if (exit?.kind === 'cover') {
    const t = smoothstep(exit.whiteFrom, exit.whiteFull, u)
    if (t > 0) cover = coverPhase(1, t, exit.style)
  }
  const previous = worlds[index - 1]?.exit
  if (cover.mode === 0 && previous?.kind === 'cover' && u < previous.revealLength) {
    cover = coverPhase(2, u / previous.revealLength, previous.style)
  }

  return {
    progress,
    index,
    u,
    world,
    pose: (aspect) => world.cameraPath(u, aspect),
    portal:
      exit?.kind === 'portal'
        ? {
            open: u >= exit.openAt,
            blend: smoothstep(exit.blendRange[0], exit.blendRange[1], u),
          }
        : null,
    cover,
    caption: world.captions.find((c) => u >= c.from && u < c.to),
  }
}
