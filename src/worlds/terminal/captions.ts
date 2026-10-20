import type { Caption } from '@/core/caption'
import { storyToU } from './beats'
import { recovered } from './recovered'

/**
 * The terminal's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - Ranges are written in story time (0 to 1, see `beats.ts`) and placed with `storyToU`, so
 *   they end with the story, before the CRT shutdown.
 * - The text is written during the first part of the range and then stays until the end.
 *   Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - Numbers about real tools are listed with their sources in docs/CAPTION-SOURCES.md. What is
 *   said about REA must match the terminal's own script (`script.ts`).
 * - The terminal's recovered-mechanics table fills the lower half of the screen late in the
 *   story: the caption that overlaps it sits at the top (check at desktop size).
 */
export const captions: Caption[] = [
  {
    from: storyToU(0.1),
    to: storyToU(0.38),
    kicker: 'WORLD 04 · THE NUMBERS',
    headline: 'Under the hood',
    body: 'A finished game is only bytes. In hex, 55 89 E5 reads "push ebp, mov ebp,esp": often the start of a function. A disassembler spells such bytes out as assembly.',
    footnote: 'The bytes on screen are made up for this page.',
  },
  {
    from: storyToU(0.42),
    to: storyToU(0.6),
    kicker: 'DECOMPILERS',
    headline: 'Bytes to pseudocode',
    body: 'Free tools such as Ghidra, public since 2019, include a decompiler that turns assembly into readable pseudocode. A person still has to work out what each routine is for.',
  },
  {
    anchor: 'top',
    from: storyToU(0.7),
    to: storyToU(1),
    kicker: 'RECOVERED',
    headline: 'The feel, rebuilt',
    body: `Name the routines, read the constants, rebuild the feel: ${Object.keys(recovered).length} numbers the hero jumped with.`,
  },
]
