import type { Caption } from '@/core/caption'

/**
 * Pong's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - `settled: true` skips the reveal (the caption is complete from its start).
 */
export const captions: Caption[] = [
  {
    from: 0,
    to: 0.42,
    kicker: 'WORLD 01 · 1972',
    headline: 'Pong',
    body: 'Pong has two parts. Rules: the ball bounces off walls and paddles, and where it lands on a paddle sets its angle. Assets: the white shapes and the beeps.',
    stats: [
      { label: 'YEAR', value: '1972' },
      { label: 'PADDLES', value: '2' },
      { label: 'BALLS', value: '1' },
      { label: 'BUILT FROM', value: 'logic chips' },
    ],
  },
  {
    from: 0.42,
    to: 0.7,
    kicker: 'THE IDEA',
    headline: 'Rules plus assets',
    body: 'A game is rules plus assets. Rules decide what happens; assets are what you see and hear. Keep the rules, swap the assets, and it plays the same in a new costume.',
  },
  {
    from: 0.7,
    to: 1,
    kicker: 'BEHIND THE BLOCK',
    body: "Run one game's rules with another game's assets and you have a crossover. The next world was already running behind it.",
  },
]
