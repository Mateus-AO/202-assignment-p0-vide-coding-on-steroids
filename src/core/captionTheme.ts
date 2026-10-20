/**
 * Where a caption box sits on the screen. `bottom-right` is a narrow box in the corner on
 * wide screens; on phones it is the same full-width box as `bottom`.
 */
export type CaptionAnchor = 'bottom' | 'top' | 'bottom-right'

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
      border: '#a08c6a',
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
    anchor: 'bottom-right',
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

/** What decides a caption's look: its own override, else the world's theme, else Pong's. */
export const DEFAULT_CAPTION_THEME: CaptionThemeId = 'pong'

/**
 * The theme a caption is drawn with: `caption.theme`, else the world's `theme`, else the
 * default. An id outside the registry also falls back, so a bad value never draws a blank box.
 */
export function resolveCaptionTheme(
  caption: { theme?: CaptionThemeId } | undefined,
  worldTheme?: CaptionThemeId,
): CaptionTheme {
  const id = caption?.theme ?? worldTheme ?? DEFAULT_CAPTION_THEME
  return CAPTION_THEMES[id] ?? CAPTION_THEMES[DEFAULT_CAPTION_THEME]
}

/** Where a caption's box sits: its own `anchor`, else the resolved theme's. */
export function resolveCaptionAnchor(
  caption: { anchor?: CaptionAnchor } | undefined,
  theme: CaptionTheme,
): CaptionAnchor {
  return caption?.anchor ?? theme.anchor
}

const channel = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

/** WCAG contrast ratio of two `#rrggbb` colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
