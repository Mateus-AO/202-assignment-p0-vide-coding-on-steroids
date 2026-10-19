import type { Caption } from '@/core/world'
import type { BootLine } from './loading'

/** The loading screen has no caption box; its words are drawn on the glass (`bootLog`, `screenText`). */
export const captions: Caption[] = []

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
