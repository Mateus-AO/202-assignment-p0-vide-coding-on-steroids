import { glassRect } from './camera'

/** The picture drawn on the glass, in pixels of a 4:3 grid (scaled up on the high tier). */
export const LOGICAL_W = 320
export const LOGICAL_H = 240
export const FONT_PX = 8

export const MARGIN_X = 26
export const TITLE_Y = 22
export const RULE_Y = 36
export const LOG_Y = 48
export const LOG_STEP = 13
export const LABEL_Y = 134
export const BAR_Y = 148
export const BAR_H = 14
export const CELL_W = 12

/** The Play button's center, as a fraction of the glass picture's height (below the bar). */
export const BUTTON_Y = 0.83

/** Where the Play button's center sits in the viewport while the screen waits (fractions). */
export function playButtonSpot(aspect: number) {
  const g = glassRect(aspect)
  return { left: g.left + g.width / 2, top: g.top + g.height * BUTTON_Y }
}
