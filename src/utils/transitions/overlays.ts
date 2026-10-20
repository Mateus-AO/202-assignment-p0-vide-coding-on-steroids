import type { CoverPhase } from './ScreenMosaic'

/** The three full-screen overlays that draw covers. Each cover style belongs to exactly one. */
export type CoverOverlay = 'mosaic' | 'crt' | 'glitch'

const OFF: CoverPhase = { mode: 0, t: 0 }

/** The overlay that draws a cover: `crt` and `glitch` have their own, the rest are the mosaic's. */
export const overlayOf = (cover: CoverPhase): CoverOverlay =>
  cover.style === 'crt' || cover.style === 'glitch' ? cover.style : 'mosaic'

/** What `overlay` should draw for `cover`: the cover itself if it is its own, otherwise off. */
export const coverFor = (overlay: CoverOverlay, cover: CoverPhase): CoverPhase =>
  overlayOf(cover) === overlay ? cover : OFF
