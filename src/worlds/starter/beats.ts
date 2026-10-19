import { defineBeats } from '@/core/beats'

export const beats = defineBeats({
  /** The camera flies from the loading screen toward the glass. */
  flight: [0.02, 1],
  /** The picture drops out through static and dims to black. */
  tune: [0.2, 0.5],
  /** The next world takes over the screen. */
  blend: [0.62, 0.97],
})

/** The portal opens in the glass once the picture has gone dark. */
export const OPEN_AT = beats.ranges.tune[1]
/** The caption (title and tagline) is up while the screen waits and the flight begins. */
export const CAPTION_END = 0.12
/** The Play button is shown only below this progress (the flight has not really started). */
export const BUTTON_UNTIL = 0.04
