import type { Caption } from '@/core/world'
import { CAPTION_END } from './beats'
import type { BootLine } from './loading'

/** Placeholder copy; the words are the owner's to rewrite. */
export const captions: Caption[] = [
  {
    from: 0,
    to: CAPTION_END,
    // The page's first caption: shown complete on load, so it never opens blank.
    settled: true,
    kicker: 'SIGNAL 00 / BOOT',
    headline: 'P0 CROSSOVER RIG',
    body: 'How crossover games get built: pull the rules apart, keep the feel.',
  },
]

/** What the CRT prints while it starts. Lines with a task say OK only when that really finished. */
export const bootLog: readonly BootLine[] = [
  { text: 'p0 rig v0.1 cold boot' },
  { text: 'checking memory... 640K' },
  { text: 'loading pixel font', task: 'fonts' },
  { text: 'tuning the screen', task: 'shaders' },
  { text: 'mounting worlds', task: 'next-world' },
  { text: 'rules and assets apart' },
]

/** Words drawn on the glass besides the log. */
export const screenText = {
  title: 'P0 // BOOT',
  loading: 'LOADING',
  ready: 'READY',
  ok: 'OK',
  pending: '..',
} as const
