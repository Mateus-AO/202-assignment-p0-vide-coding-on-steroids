import type { Caption } from '@/core/caption'
import { HITS } from './rally'

/**
 * Pong's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - Numbers about the page come from the rally itself (`HITS`). Numbers about the real
 *   machine are listed with their sources in docs/CAPTION-SOURCES.md; add a row there for
 *   every new one.
 * - `theme` and `anchor` on a caption override the world's look for that caption only.
 */

/** Contacts in the rally before the block breaks: paddles and walls (the block is not one). */
const BOUNCES = HITS.filter((h) => h.kind !== 'block').length

export const captions: Caption[] = [
  {
    from: 0,
    to: 0.22,
    kicker: 'WORLD 01 · 1972',
    headline: 'Pong',
    body: 'Two paddles, one ball, and no processor at all. The rules are wired into about 66 logic chips.',
    stats: [
      { label: 'YEAR', value: '1972' },
      { label: 'LOGIC CHIPS', value: '~66' },
      { label: 'PROCESSOR', value: 'none' },
      { label: 'THIS RALLY', value: `${BOUNCES} bounces` },
    ],
  },
  {
    from: 0.22,
    to: 0.45,
    kicker: 'THE RULES',
    headline: 'Where it lands is the angle',
    body: 'Each paddle is cut into eight zones. The zone the ball hits decides the angle it leaves at, and the longer a rally lasts, the faster the ball flies.',
    stats: [{ label: 'PADDLE ZONES', value: '8' }],
  },
  {
    from: 0.45,
    to: 0.7,
    kicker: 'THE IDEA',
    headline: 'Rules plus assets',
    body: 'Rules: the angle zones and the speed-up. Assets: white shapes and beeps, and even the beeps came from the video sync generator. Keep the rules, swap the assets, and it plays the same in a new costume.',
  },
  {
    // Wears the next world's look: this caption is about what is behind the block.
    theme: 'voxel',
    from: 0.7,
    to: 1,
    kicker: 'BEHIND THE BLOCK',
    body: "Run one game's rules with another game's assets and you have a crossover: this bounce rule on a field of blocks. The next world was already running behind it.",
  },
]
