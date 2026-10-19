import type { Caption } from '@/core/caption'

/**
 * The wall's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 */
export const captions: Caption[] = [
  {
    from: 0.2,
    to: 0.56,
    kicker: 'WORLD 05 · MANY GAMES, ONE AGENT',
    body: 'One decomp rebuilds one game. An agent can read many.',
    footnote: 'Nine screens, nine made-up binaries, one picture.',
  },
  {
    from: 0.78,
    to: 1,
    kicker: 'THE POINT',
    headline: 'Readable at last',
    body: 'Give an agent the right tools and it can read what nobody documented.',
  },
]
