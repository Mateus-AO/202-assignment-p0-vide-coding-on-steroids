import type { Caption } from '@/core/caption'
import { beats } from './beats'
import { MAX_HEIGHT } from './terrain'

/**
 * The voxel world's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - Numbers about the page come from the terrain (`MAX_HEIGHT`). Numbers about real games are
 *   listed with their sources in docs/CAPTION-SOURCES.md; add a row there for every new one.
 * - Keep the REA link on the third caption, and keep what it says about REA in line with the
 *   terminal's script (`worlds/terminal/script.ts`).
 */
export const captions: Caption[] = [
  {
    from: 0,
    to: 0.3,
    kicker: 'WORLD 02 · 2011',
    headline: 'Blocks',
    body: `A voxel is a pixel with volume: one value in a 3D grid. Here each column is one height, 0 to ${MAX_HEIGHT}, and a formula fills in the field.`,
    stats: [
      { label: 'YEAR', value: '2011' },
      { label: 'TALLEST', value: `${MAX_HEIGHT} blocks` },
      { label: 'CHUNK', value: '16 x 16' },
    ],
    footnote: 'A chunk: a slice of the world 16 blocks wide and long.',
  },
  {
    from: 0.3,
    to: 0.52,
    kicker: 'WHY IT MODS',
    headline: 'Data you can extend',
    body: "A block is just an entry in a table, so modders add new ones without touching the engine. Many mod frameworks began by reverse-engineering the game's code; in 2019 its studio published name maps for it.",
  },
  {
    from: 0.52,
    to: beats.ranges.hiss[0],
    kicker: 'TODAY · REA',
    headline: 'Mechanics, recovered',
    body: "A decompilation rebuilds readable code from a finished program, by hand. REA is an MCP server and CLI that lets an AI agent read an old binary's pseudocode and assembly.",
    footnote: 'Answers come with evidence. Analysis runs locally.',
    link: {
      href: 'https://github.com/morluto/rea',
      label: 'See REA on GitHub',
    },
  },
  {
    from: beats.ranges.hiss[0],
    to: 1,
    kicker: 'FUSE LIT',
    body: 'Sssssssssss…',
  },
]
