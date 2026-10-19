import type { Caption } from '@/core/caption'
import { storyToU } from './beats'

/**
 * The terminal's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - Ranges are written in story time (0 to 1, see `beats.ts`) and placed with `storyToU`, so
 *   they end with the story, before the CRT shutdown.
 * - The text is written during the first part of the range and then stays until the end.
 *   Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - No stats here, and the second body stays one line: the terminal's own table shows the numbers
 *   and the caption must not cover it (check at desktop size).
 */
export const captions: Caption[] = [
  {
    from: storyToU(0.1),
    to: storyToU(0.4),
    kicker: 'WORLD 04 · THE NUMBERS',
    headline: 'Under the hood',
    body: "A finished game is only bytes. A disassembler turns them into assembly: tiny steps like load, add, jump. Somewhere in there hides the hero's jump.",
    footnote: 'The bytes on screen are made up for this page.',
  },
  {
    from: storyToU(0.7),
    to: storyToU(1),
    kicker: 'RECOVERED',
    headline: 'The feel, rebuilt',
    body: 'Name the routines, read the constants, rebuild the feel.',
  },
]
