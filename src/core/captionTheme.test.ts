import { describe, expect, it } from 'vitest'
import { CAPTION_THEME_IDS, CAPTION_THEMES } from './captionTheme'

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
