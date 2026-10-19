import { CanvasTexture, NearestFilter } from 'three'

/** One glyph cell in the atlas, in pixels. */
export const GLYPH_W = 8
export const GLYPH_H = 14
export const ATLAS_COLS = 16
export const ATLAS_ROWS = 6
/** The atlas holds ASCII codes 32 to 127; 127 is drawn as a solid block (the cursor). */
export const FIRST_CODE = 32

/**
 * A bitmap font painted in code: the browser's monospace face, drawn small and thresholded so
 * every glyph edge is a hard pixel. Only the alpha channel carries the glyph.
 */
export function createFontAtlas() {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_COLS * GLYPH_W
  canvas.height = ATLAS_ROWS * GLYPH_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `bold ${GLYPH_H - 3}px monospace`

  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const x = (i % ATLAS_COLS) * GLYPH_W
    const y = Math.floor(i / ATLAS_COLS) * GLYPH_H
    if (i + FIRST_CODE === 127) {
      ctx.fillRect(x + 1, y + 1, GLYPH_W - 2, GLYPH_H - 2)
      continue
    }
    const glyph = String.fromCharCode(i + FIRST_CODE)
    ctx.fillText(glyph, x + (GLYPH_W - ctx.measureText(glyph).width) / 2, y + GLYPH_H - 4)
  }

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < image.data.length; i += 4) {
    image.data[i] = image.data[i] >= 110 ? 255 : 0
  }
  ctx.putImageData(image, 0, 0)

  const texture = new CanvasTexture(canvas)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.flipY = false
  return texture
}
