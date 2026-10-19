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
    body: 'A voxel is a pixel with volume. The world is a 3D grid and each cell holds one block type. Because it is just data on a grid, players can add new blocks and behaviours as mods.',
    stats: [
      { label: 'YEAR', value: '2011' },
      { label: 'STORED AS', value: '3D grid' },
      { label: 'EXTENDED BY', value: 'mods' },
    ],
  },
  {
    from: 0.32,
    to: beats.ranges.hiss[0],
    kicker: 'TODAY · REA',
    headline: 'Mechanics, recovered',
    body: 'A decompilation turns a finished program back into readable code, slowly, by hand. An AI agent with REA can open an old binary, find a mechanic and port it.',
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
