import type { Caption } from '@/core/caption'
import { beats } from './beats'
import { COLS, ROWS } from './arena'

/**
 * The arena's captions, in the voice of an old role-playing game's dialog box (the theme is
 * `arena` in `core/captionTheme.ts`). Plain data: edit the strings and ranges, nothing else
 * reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first part
 *   of the range and then stays until `to`.
 * - None runs into the `title` beat: the giant title takes over the top of the screen there and
 *   the bottom stays clear for the arena. A test enforces it.
 * - Keep every fact checkable; the numbers come from the arena itself.
 */
export const captions: Caption[] = [
  {
    from: 0.03,
    to: 0.27,
    kicker: 'WORLD 06 · THE ARENA',
    headline: 'The party gathers',
    body: 'A crossover starts with a cast. Four characters from three different games walk into one room, each with its own rules and art.',
    stats: [
      { label: 'CAST', value: '4' },
      { label: 'GAMES', value: '3' },
      { label: 'ARENA', value: `${COLS} x ${ROWS}` },
    ],
  },
  {
    from: 0.29,
    to: 0.46,
    kicker: 'PARTY FORMED',
    headline: 'Each keeps its rules',
    body: 'In a role-playing game the party is a list of members, each with its own moves. Here the paddle still returns the ball and the hero still hops the pipe.',
  },
  {
    from: beats.ranges.merge[0] + 0.01,
    to: beats.ranges.title[0] - 0.02,
    // Top of the screen: the ring is down in the arena, and the giant title takes this spot next.
    anchor: 'top',
    kicker: 'MERGE',
    headline: 'Then they merge',
    body: 'A pull request proposes a change; a merge folds it into the main line. Crossovers work the same way: separate branches of work join into one game.',
  },
]
