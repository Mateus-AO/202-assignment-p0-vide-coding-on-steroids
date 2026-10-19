import type { Caption } from '@/core/caption'

/**
 * Pong's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - `settled: true` skips the reveal (only the page's first caption, so it never loads blank).
 */
export const captions: Caption[] = [
  {
    from: 0,
    to: 0.42,
    settled: true,
    kicker: 'WORLD 01 · 1972',
    headline: 'Pong',
    body: 'One ball, two paddles, no crossovers.',
    stats: [
      { label: 'YEAR', value: '1972' },
      { label: 'PLAYERS', value: '2' },
      { label: 'PADDLES', value: '2' },
      { label: 'BALLS', value: '1' },
    ],
  },
  {
    from: 0.42,
    to: 0.7,
    kicker: 'THE IDEA',
    headline: 'Rules plus assets',
    body: 'Every game is rules plus assets. Rules can be pulled apart.',
  },
  {
    from: 0.7,
    to: 1,
    kicker: 'BEHIND THE BLOCK',
    body: '…and the next world was already running behind it.',
  },
]
