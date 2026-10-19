/** Where a caption box sits on the screen. */
export type CaptionAnchor = 'bottom' | 'top'

/** How a caption's text appears as the world's progress passes its range. */
export type CaptionReveal = 'scramble' | 'typewriter' | 'fade'

/** The look of a caption box: set once per world, optionally overridden per caption. */
export type CaptionTheme = {
  id: CaptionThemeId
  /** Box fill, border, main text, highlights (headline, links), and small muted text. */
  colors: { surface: string; border: string; text: string; accent: string; muted: string }
  border: 'solid' | 'double' | 'dashed' | 'none'
  /** `pixel` is the pixel face for headline and body; `mono` uses the monospace face for all. */
  font: 'pixel' | 'mono'
  anchor: CaptionAnchor
  reveal: CaptionReveal
}

export const CAPTION_THEME_IDS = [
  'pong',
  'voxel',
  'platformer',
  'terminal',
  'wall',
  'arena',
] as const
export type CaptionThemeId = (typeof CAPTION_THEME_IDS)[number]

/**
 * One theme per world. The caption renderer and the arena's giant title both read this
 * registry, so a world's look is edited here once. First-pass values: tune freely.
 */
export const CAPTION_THEMES: Record<CaptionThemeId, CaptionTheme> = {
  pong: {
    id: 'pong',
    colors: {
      surface: '#000000',
      border: '#ffffff',
      text: '#ffffff',
      accent: '#ffffff',
      muted: '#9a9a9a',
    },
    border: 'solid',
    font: 'pixel',
    anchor: 'bottom',
    reveal: 'scramble',
  },
  voxel: {
    id: 'voxel',
    colors: {
      surface: '#2b2118',
      border: '#7a6a55',
      text: '#e8e1d4',
      accent: '#6fbf4a',
      muted: '#b5a78f',
    },
    border: 'double',
    font: 'pixel',
    anchor: 'bottom',
    reveal: 'typewriter',
  },
  platformer: {
    id: 'platformer',
    colors: {
      surface: '#5a2d0c',
      border: '#ffd84d',
      text: '#fff7dd',
      accent: '#ffd84d',
      muted: '#e8c27a',
    },
    border: 'solid',
    font: 'pixel',
    anchor: 'top',
    reveal: 'typewriter',
  },
  terminal: {
    id: 'terminal',
    colors: {
      surface: '#00141a',
      border: '#3de0ff',
      text: '#aef3ff',
      accent: '#3de0ff',
      muted: '#5aa9b8',
    },
    border: 'dashed',
    font: 'mono',
    anchor: 'bottom',
    reveal: 'scramble',
  },
  wall: {
    id: 'wall',
    colors: {
      surface: '#03140a',
      border: '#2f8f4d',
      text: '#9dffb4',
      accent: '#ffd84d',
      muted: '#4fbf6a',
    },
    border: 'solid',
    font: 'mono',
    anchor: 'bottom',
    reveal: 'scramble',
  },
  arena: {
    id: 'arena',
    colors: {
      surface: '#14101f',
      border: '#f2e9c9',
      text: '#f2e9c9',
      accent: '#4ade80',
      muted: '#a89fc4',
    },
    border: 'double',
    font: 'pixel',
    anchor: 'bottom',
    reveal: 'typewriter',
  },
}

/** The green of "merge" and the pull-request glyph, the same in every theme. */
export const MERGE_GREEN = '#3fb950'
