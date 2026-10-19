import { clamp, smoothstep } from '@/utils/math'

/**
 * A screen glitch, as pure functions of the cover mode and phase `t` in [0, 1] (so it scrubs
 * both ways and a pinned screenshot is reproducible).
 *
 *   mode 1   the picture tears: dark bands and displaced blocks grow in count and width,
 *            coloured bars and channel-split fringes flicker inside them, until the screen is
 *            opaque (`cover` = 1 from `GLITCH_FULL_AT` on, so the world swap is hidden)
 *   mode 2   the same, running backwards from a fully dark screen: it holds for a moment,
 *            then the dark bands retreat until nothing is left at t = 1
 *
 * The look is built from `step`, not from `t`: each phase is cut into `GLITCH_STEPS` frozen
 * frames (the glitch "stutters", like a bad signal), and every number below is constant inside
 * one step. Within a phase the picture changes only when `step` does.
 *
 * Flash safety (the page's rule: at most 2.5 flashes a second, never a full-screen strobe):
 *  - The dark cover is monotone. `cover` only rises in mode 1 and only falls in mode 2, and
 *    the shader decides which bands are dark with a per-band threshold that does not depend
 *    on the step, so a band that went dark stays dark. Large areas therefore change
 *    luminance once, in one direction, instead of alternating.
 *  - What changes per step (bar positions, colours, fringes, noise) is small and mostly
 *    saturated colour on a dark ground. `brightShare` bounds the share of the screen those
 *    can light at any step; it is tested to stay well under the quarter of the screen that
 *    counts as a "large area".
 *  - No white: bars are cyan, magenta or yellow at 80% and the ground is near-black.
 */
export const GLITCH_STEPS = 12
/** In mode 1 the screen is fully opaque from this share of the phase on. */
export const GLITCH_FULL_AT = 0.82
/** In mode 2 the screen stays fully opaque for this share of the phase before it clears. */
export const GLITCH_HOLD = 0.1

/** Most the bars, blocks and fringes can light at once, as a share of the screen. */
export const GLITCH_BRIGHT_CAP = 0.2

export type GlitchShape = {
  /** Frozen frame inside this phase: 0 to `GLITCH_STEPS - 1`. */
  step: number
  /** How much of the screen the dark bands have taken: 0 (none) to 1 (opaque). */
  cover: number
  /** Share of fine bars that may light and of coloured blocks that may light: 0 to 1. */
  activity: number
  /** Channel split between red and blue, as a share of the screen width. */
  split: number
  /** Seed for the band hashes; differs between the two phases. */
  seed: number
}

export const glitchStep = (t: number) =>
  Math.min(GLITCH_STEPS - 1, Math.floor(clamp(t, 0, 1) * GLITCH_STEPS))

/** The phase value a step stands for: 0 at the first step, 1 at the last. */
export const glitchStepTime = (step: number) => step / (GLITCH_STEPS - 1)

/** Dark share at the (quantised) phase `tq` of `mode`. */
function coverAt(mode: 1 | 2, tq: number) {
  if (mode === 1) return smoothstep(0, GLITCH_FULL_AT, tq)
  // Eases out, so the new world shows soon after the hold instead of lingering behind the dark.
  const x = clamp((tq - GLITCH_HOLD) / (1 - GLITCH_HOLD), 0, 1)
  return Math.pow(1 - x, 1.5)
}

/** The shape of the glitch in `mode` at phase `t`. Pass `out` to reuse an object. */
export function glitchShape(
  mode: 1 | 2,
  t: number,
  out: GlitchShape = { step: 0, cover: 0, activity: 0, split: 0, seed: 0 },
): GlitchShape {
  const step = glitchStep(t)
  const tq = glitchStepTime(step)
  const cover = coverAt(mode, tq)
  // Bars and blocks need a ground to read on and fade as the screen clears.
  const activity =
    smoothstep(0, 0.3, cover) * (0.55 + 0.45 * (1 - Math.abs(2 * cover - 1)))
  out.step = step
  out.cover = cover
  out.activity = activity
  out.split = 0.004 + 0.012 * activity
  out.seed = mode === 1 ? 3 : 11
  return out
}

/** Share of the screen the shader lights with bars and with coloured blocks at full activity. */
export const GLITCH_BAR_DENSITY = 0.1
export const GLITCH_BLOCK_DENSITY = 0.05
/** The band-end fringe lines, all layers together (a few pixels wide on each band). */
const FRINGE_SHARE = 0.01

/** Upper bound on the share of the screen the lit bars, blocks and fringes cover at a shape. */
export const brightShare = (shape: GlitchShape) =>
  shape.activity * (GLITCH_BAR_DENSITY + GLITCH_BLOCK_DENSITY + FRINGE_SHARE)
