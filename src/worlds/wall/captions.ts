import type { Caption } from '@/core/caption'
import { PIC_H, PIC_W, TV_COUNT } from './layout'
import { COLS_TV, ROWS_TV } from './script'

/**
 * The wall's captions. Plain data: edit the strings and ranges, nothing else reads them.
 * - `from` / `to` are the world's progress (0 to 1); the text is written during the first
 *   part of the range and then stays until `to`. Give long copy a long range.
 * - Fields (all optional, at least one): kicker, headline, body, stats (up to 4 label/value
 *   pairs; a leading number counts up), footnote, link. Keep every fact checkable.
 * - Numbers about the page come from the layout (`TV_COUNT`, the screen and picture sizes).
 *   Claims about real decompilation projects are listed with their sources in
 *   docs/CAPTION-SOURCES.md; add a row there for every new one.
 */
export const captions: Caption[] = [
  {
    from: 0.2,
    to: 0.56,
    kicker: 'WORLD 05 · MANY GAMES, ONE AGENT',
    body: 'One decomp rebuilds one game, a function at a time. An agent can open many binaries side by side and report what each one does.',
    stats: [
      { label: 'SCREENS', value: String(TV_COUNT) },
      { label: 'BINARIES', value: `${TV_COUNT}, made up` },
      { label: 'EACH SCREEN', value: `${COLS_TV} x ${ROWS_TV}` },
    ],
  },
  {
    from: 0.56,
    to: 0.78,
    kicker: 'ONE PICTURE',
    headline: 'Pieces of a whole',
    body: 'Each set holds one slice of the picture and none has the whole. It only appears when every answer is put together.',
    stats: [{ label: 'PICTURE', value: `${PIC_W} x ${PIC_H} cells` }],
  },
  {
    from: 0.78,
    to: 1,
    kicker: 'THE POINT',
    headline: 'Readable at last',
    body: 'Give an agent the right tools and it can read what nobody documented. A decomp ships the code only; you bring your own copy of the game for its art and sound. Every answer comes with its evidence.',
  },
]
