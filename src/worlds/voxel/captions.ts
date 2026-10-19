import type { Caption } from '@/core/caption'
import { beats } from './beats'

/**
 * The voxel world's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - Keep the REA link on the second caption.
 */
export const captions: Caption[] = [
  {
    from: 0,
    to: 0.32,
    kicker: 'WORLD 02 · 2011',
    headline: 'Blocks',
    body: 'A whole world made of blocks, and of mods.',
    stats: [
      { label: 'YEAR', value: '2011' },
      { label: 'MADE OF', value: 'blocks' },
      { label: 'EXTENDED BY', value: 'mods' },
    ],
    footnote: 'Everything here is a cube on a grid.',
  },
  {
    from: 0.32,
    to: beats.ranges.hiss[0],
    kicker: 'TODAY · REA',
    headline: 'Mechanics, recovered',
    body: 'Today an AI agent can recover a mechanic from a decades-old binary and port it into a new game.',
    footnote: 'REA is an MCP server and CLI for AI agents. Its analysis runs locally.',
    link: {
      href: 'https://github.com/morluto/rea',
      label: 'See REA, a tool that does this',
    },
  },
  {
    from: beats.ranges.hiss[0],
    to: 1,
    kicker: 'FUSE LIT',
    body: 'Sssssssssss…',
  },
]
