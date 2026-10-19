import { clamp, easeInOutCubic, lerp, smoothstep } from '@/utils/math'

/**
 * A TV shutting down, as pure functions of the phase `t` in [0, 1] (so it scrubs both ways).
 *
 *   bars   black bars close from top and bottom toward the middle, leaving a thin bright line
 *   line   the line shrinks horizontally to a dot
 *   dot    the dot fades; at t = 1 the screen is fully black
 *
 * One event, no flashing: `reach` and `fade` never rise, `light` never falls, and `band`
 * falls through the bars, then swells a little (line to dot size) while the line shrinks.
 * `glow` rises through the bars and the line, then falls with the dot.
 */
export const CRT_BARS_END = 0.45
export const CRT_LINE_END = 0.8

/** Half-height of the bright line, in half-screen-heights (about 3.6 px on a 720 px screen). */
export const CRT_LINE_BAND = 0.01
/** Radius of the dot it shrinks to, same unit. */
export const CRT_DOT_BAND = 0.016

export type CrtShape = {
  /** Half-height of the lit band, in half-screen-heights: 1 (nothing covered) down to a line. */
  band: number
  /** Half-length of the lit band as a share of the half-screen-width: 1 down to 0 (a dot). */
  reach: number
  /** How far the lit band has turned from the picture into bright blue-white: 0 to 1. */
  light: number
  /** Strength of the soft glow around the lit band (already faded with the dot). */
  glow: number
  /** Brightness of the line and dot: 1 until the dot starts to fade, then 0 at t = 1. */
  fade: number
}

const GLOW_BASE = 0.55
const GLOW_PEAK = 0.95

/** The shape of the shutdown at phase `t`. Pass `out` to reuse an object (no allocation). */
export function crtShape(
  t: number,
  out: CrtShape = { band: 1, reach: 1, light: 0, glow: 0, fade: 1 },
): CrtShape {
  const x = clamp(t, 0, 1)
  const bars = easeInOutCubic(clamp(x / CRT_BARS_END, 0, 1))
  const line = easeInOutCubic(
    clamp((x - CRT_BARS_END) / (CRT_LINE_END - CRT_BARS_END), 0, 1),
  )
  const fade = 1 - smoothstep(CRT_LINE_END, 1, x)

  out.band = lerp(1, lerp(CRT_LINE_BAND, CRT_DOT_BAND, line), bars)
  out.reach = 1 - line
  out.light = smoothstep(0.3, 1, bars)
  out.glow = lerp(GLOW_BASE, GLOW_PEAK, line) * smoothstep(0, 0.6, bars) * fade
  out.fade = fade
  return out
}
