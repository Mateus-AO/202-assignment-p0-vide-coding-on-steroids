import type { Caption } from '@/core/caption'
import { PIPES } from './config'
import { mechanics } from './mechanics'

/**
 * The platformer's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - The level's numbers come from the level itself (`config`, `mechanics`), so they cannot
 *   drift. Numbers about real machines are listed with their sources in
 *   docs/CAPTION-SOURCES.md; add a row there for every new one.
 * - The world's theme puts the box in the bottom-right corner on wide screens (the hero rides
 *   left of centre there) and full width at the bottom on phones.
 */
export const captions: Caption[] = [
  {
    from: 0.12,
    to: 0.4,
    kicker: 'WORLD 03 · 1985',
    headline: 'Run, jump, flag',
    body: `A platformer repeats one loop: read the input, move the hero, check what he touches. This level is ${mechanics.runDistance} blocks long, and the same jump clears all ${PIPES.length} pipes.`,
    stats: [
      { label: 'LEVEL', value: `${mechanics.runDistance} blocks` },
      { label: 'PIPES', value: String(PIPES.length) },
      { label: 'JUMP HIGH', value: `${mechanics.pipeJumpHeight} blocks` },
      { label: 'JUMP LONG', value: `${mechanics.pipeJumpWidth} blocks` },
    ],
  },
  {
    from: 0.4,
    to: 0.62,
    kicker: 'TAKEN APART',
    headline: 'A feel is a list of numbers',
    body: `A jump is a launch speed plus gravity, added every frame. Change one number, say ${mechanics.pipeJumpHeight} blocks to 3, and the same level plays like a different game.`,
    footnote: 'One famous 8-bit console of 1985 had 2 KB of RAM.',
  },
  {
    from: 0.62,
    to: 0.78,
    kicker: 'BORROWED FEEL',
    body: 'Recover the jump, the bump and the coin from the original, and any other game can use the same feel.',
  },
  {
    from: 0.79,
    to: 0.95,
    kicker: 'INSIDE',
    body: 'None of these numbers is written in the level. They live in the program, behind that door.',
  },
]
