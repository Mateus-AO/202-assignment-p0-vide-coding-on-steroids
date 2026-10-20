import { describe, expect, it } from 'vitest'
import {
  CAPTION_THEME_IDS,
  CAPTION_THEMES,
  DEFAULT_CAPTION_THEME,
  contrastRatio,
  resolveCaptionAnchor,
  resolveCaptionTheme,
  type CaptionThemeId,
} from './captionTheme'

describe('caption themes', () => {
  it('has one theme per id, each stored under its own id', () => {
    for (const id of CAPTION_THEME_IDS) expect(CAPTION_THEMES[id].id).toBe(id)
    expect(Object.keys(CAPTION_THEMES).sort()).toEqual([...CAPTION_THEME_IDS].sort())
  })

  it('uses hex colours and a text colour different from the surface', () => {
    for (const t of Object.values(CAPTION_THEMES)) {
      for (const c of Object.values(t.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.colors.text.toLowerCase()).not.toBe(t.colors.surface.toLowerCase())
    }
  })
})

describe('theme readability', () => {
  it('keeps text, headline and small text readable on the box (WCAG AA, 4.5:1)', () => {
    for (const t of Object.values(CAPTION_THEMES)) {
      const { surface, text, accent, muted } = t.colors
      expect(contrastRatio(text, surface), `${t.id} text`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(accent, surface), `${t.id} accent`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(muted, surface), `${t.id} muted`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps the border visible against the box (3:1) unless there is none', () => {
    for (const t of Object.values(CAPTION_THEMES)) {
      if (t.border === 'none') continue
      expect(
        contrastRatio(t.colors.border, t.colors.surface),
        t.id,
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('measures contrast like WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })
})

describe('resolveCaptionTheme', () => {
  it('prefers the caption, then the world, then Pong', () => {
    expect(resolveCaptionTheme({ theme: 'wall' }, 'voxel').id).toBe('wall')
    expect(resolveCaptionTheme({}, 'voxel').id).toBe('voxel')
    expect(resolveCaptionTheme({}, undefined).id).toBe('pong')
    expect(resolveCaptionTheme(undefined, 'terminal').id).toBe('terminal')
  })

  it('falls back to the default for an id outside the registry', () => {
    const bad = 'nope' as unknown as CaptionThemeId
    expect(resolveCaptionTheme({ theme: bad }).id).toBe(DEFAULT_CAPTION_THEME)
  })
})

describe('resolveCaptionAnchor', () => {
  it('uses the caption anchor, else the theme anchor', () => {
    const corner = CAPTION_THEMES.platformer
    const bottom = CAPTION_THEMES.pong
    expect(resolveCaptionAnchor({}, corner)).toBe('bottom-right')
    expect(resolveCaptionAnchor({ anchor: 'bottom' }, corner)).toBe('bottom')
    expect(resolveCaptionAnchor({ anchor: 'top' }, bottom)).toBe('top')
    expect(resolveCaptionAnchor(undefined, bottom)).toBe('bottom')
  })
})
