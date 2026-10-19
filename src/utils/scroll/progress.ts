import { clamp } from '@/utils/math'

/**
 * Scroll offset where overall progress reaches 1: the bottom of the content that drives the
 * worlds (the spacer) lined up with the bottom of the viewport. Anything after that content
 * (the footer) is scrolled through with progress held at 1.
 *
 * `contentBottom` is the content's bottom edge in document coordinates.
 */
export function scrollEnd(contentBottom: number, viewportHeight: number) {
  return Math.max(0, contentBottom - viewportHeight)
}

/** Overall progress in [0, 1] at scroll offset `scrollY`; 0 when there is nothing to scroll. */
export function progressAtScroll(scrollY: number, end: number) {
  return end > 0 ? clamp(scrollY / end, 0, 1) : 0
}

/** The scroll offset that puts overall progress at `progress`. */
export function scrollForProgress(progress: number, end: number) {
  return clamp(progress, 0, 1) * Math.max(0, end)
}
