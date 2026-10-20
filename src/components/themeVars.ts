import type { CSSProperties } from 'react'
import type { CaptionTheme } from '@/core/captionTheme'

/**
 * A theme's colours as the `--caption-*` custom properties that the caption box and the small
 * pixel button read (see `styles/index.css`). Set them as an element's inline style.
 */
export function themeVars(theme: CaptionTheme): CSSProperties {
  const { surface, border, text, accent, muted } = theme.colors
  return {
    '--caption-bg': surface,
    '--caption-border': border,
    '--caption-fg': text,
    '--caption-accent': accent,
    '--caption-muted': muted,
  } as CSSProperties
}
