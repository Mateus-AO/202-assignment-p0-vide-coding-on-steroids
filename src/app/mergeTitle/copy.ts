import { clamp } from '@/utils/math'
import type { Field } from '@/core/reveal'

/** The giant title's words and how its reveal follows the arena's `title` beat. */

/** Split so "merge" (green, with the pull-request glyph after it) is its own part. */
export const TITLE_PARTS = ['You can ', 'merge', ' anything'] as const
export const TITLE_TEXT = TITLE_PARTS.join('')
/** Index of the green part in TITLE_PARTS. */
export const MERGE_PART = 1

export const REA_URL = 'https://github.com/morluto/rea'
/**
 * The subtitle, and the label of the link. Only claims the page already makes (the voxel
 * world's REA caption): an MCP server and CLI for AI agents, recovers mechanics from old
 * binaries, analysis runs locally.
 */
export const SUBTITLE_TEXT =
  'REA is an MCP server and CLI for AI agents that recovers mechanics from old binaries. Its analysis runs locally.'

/** Title first, then the subtitle (the link), written in that order by weight. */
export const TITLE_FIELDS: readonly Field[] = [
  { key: 'headline', weight: TITLE_TEXT.length },
  { key: 'body', weight: SUBTITLE_TEXT.length },
]

/** The reveal takes this share of the `title` beat; the rest is reading time. */
export const TITLE_REVEAL_SHARE = 0.6

/**
 * How far written the title is at the arena's progress `u` for a beat `[from, to]`: -1
 * before the beat (hidden), then 0 to 1 over the first TITLE_REVEAL_SHARE of the beat, and 1
 * from there on (it stays).
 */
export function titleReveal(u: number, from: number, to: number): number {
  if (u < from) return -1
  return clamp((u - from) / ((to - from) * TITLE_REVEAL_SHARE), 0, 1)
}

/**
 * The title's progress source value: the arena's `u` while the arena is the active world,
 * else -1. `lastWorld` is whether the active world is the arena.
 */
export const titleSourceValue = (isArena: boolean, u: number) => (isArena ? u : -1)

/**
 * Cuts the first `shown` characters of the full title into its parts. For part `i`,
 * `visible[i]` is the text to show (already written) and `hidden[i]` the rest of the part,
 * which keeps its place invisibly so lines never re-wrap. `text` may be longer or shorter
 * than the title (the noise version); only its first `shown` characters are used.
 */
export function cutParts(
  text: string,
  shown: number,
  visible: string[],
  hidden: string[],
): void {
  let start = 0
  for (let i = 0; i < TITLE_PARTS.length; i++) {
    const end = start + TITLE_PARTS[i].length
    const upto = clamp(shown, start, end)
    visible[i] = text.slice(start, upto)
    hidden[i] = TITLE_TEXT.slice(upto, end)
    start = end
  }
}
