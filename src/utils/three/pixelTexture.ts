import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'

/** Crisp pixel-art texture painted in code; `paint` receives a 2D context of size x size. */
export function createPixelTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  paint(canvas.getContext('2d')!)
  const texture = new CanvasTexture(canvas)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}
