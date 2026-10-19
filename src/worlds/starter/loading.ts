import { READY_NEXT_WORLD } from '@/core/readiness'
import { clamp } from '@/utils/math'

/** Things that must genuinely finish before the screen reads READY. */
export const TASKS = ['fonts', 'shaders', READY_NEXT_WORLD] as const
export type TaskId = (typeof TASKS)[number]

/** One line of the boot log. A line with a task shows OK only once that task has finished. */
export type BootLine = { text: string; task?: TaskId }

/** The screen stays on the loading state at least this long, even if everything is ready. */
export const MIN_BOOT_SECONDS = 2.2
/** After this long a task that never reported counts as settled, so Play cannot stay stuck. */
export const GIVE_UP_SECONDS = 12
export const CHARS_PER_SECOND = 60
export const BAR_CELLS = 22

/** What the screen shows, rewritten in place each frame (nothing is allocated). */
export type BootView = {
  /** Characters of the log typed so far, counted across all lines. */
  typed: number
  /** Bit i is set when line i has a finished OK. */
  okMask: number
  /** Filled cells of the loading bar, 0 to BAR_CELLS. */
  cells: number
  percent: number
  /** Everything finished and the minimum boot time passed: Play may be pressed. */
  ready: boolean
}

export const createBootView = (): BootView => ({
  typed: 0,
  okMask: 0,
  cells: 0,
  percent: 0,
  ready: false,
})

/** The whole log typed, every line OK, the bar full: how the screen looks once booted. */
export function bootedViewInto(out: BootView, lines: readonly BootLine[]) {
  let chars = 0
  for (let i = 0; i < lines.length; i++) chars += lines[i].text.length
  out.typed = chars
  out.okMask = (1 << lines.length) - 1
  out.cells = BAR_CELLS
  out.percent = 100
  out.ready = true
  return out
}

/**
 * The loading screen at `elapsed` seconds. The bar is the lesser of two things: how much of the
 * real startup work has finished (`done`: ids from the readiness store) and how much of the
 * minimum boot time has passed. So it never runs ahead of the work, and never jumps to full
 * just because the work was fast. With `lineWise` (reduced motion) a line appears whole
 * instead of typing out.
 */
export function bootViewInto(
  out: BootView,
  lines: readonly BootLine[],
  done: Readonly<Record<string, true | undefined>>,
  elapsed: number,
  { minSeconds = MIN_BOOT_SECONDS, lineWise = false } = {},
) {
  const gaveUp = elapsed >= GIVE_UP_SECONDS
  let finished = 0
  for (let i = 0; i < TASKS.length; i++) if (done[TASKS[i]] || gaveUp) finished++
  const progress = Math.min(finished / TASKS.length, clamp(elapsed / minSeconds, 0, 1))

  out.percent = Math.floor(progress * 100 + 1e-9)
  out.cells = Math.floor(progress * BAR_CELLS + 1e-9)
  out.ready = progress >= 1

  let left = Math.max(0, Math.floor(elapsed * CHARS_PER_SECOND))
  let typed = 0
  let mask = 0
  for (let i = 0; i < lines.length; i++) {
    const { text, task } = lines[i]
    const shown = lineWise && left > 0 ? text.length : Math.min(left, text.length)
    typed += shown
    left = Math.max(0, left - shown)
    if (shown === text.length && (!task || done[task] || gaveUp)) mask |= 1 << i
  }
  out.typed = typed
  out.okMask = mask
  return out
}
