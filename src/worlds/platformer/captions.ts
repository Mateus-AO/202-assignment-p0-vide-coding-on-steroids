import type { Caption } from '@/core/caption'
import { PIPES } from './config'
import { mechanics } from './mechanics'

/**
 * The platformer's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - The numbers come from the level itself (`config`, `mechanics`), so they cannot drift.
 */
export const captions: Caption[] = [
  {
    from: 0.14,
    to: 0.46,
    kicker: 'WORLD 03 · 1985',
    headline: 'Run, jump, flag',
    body: 'A plumber, a flat world, a thousand remixes.',
    stats: [
      { label: 'LEVEL', value: `${mechanics.runDistance} blocks` },
      { label: 'PIPES', value: String(PIPES.length) },
      { label: 'PIPE JUMP', value: `${mechanics.pipeJumpHeight} blocks` },
      { label: 'GOAL', value: 'flag, castle' },
    ],
  },
  {
    from: 0.46,
    to: 0.78,
    kicker: 'TAKEN APART',
    headline: 'Same trick, any world',
    body: 'Every world you crossed can be taken apart like this.',
    footnote:
      'Jump height, jump width, how far a block bumps: a feel is a list of numbers.',
  },
]
