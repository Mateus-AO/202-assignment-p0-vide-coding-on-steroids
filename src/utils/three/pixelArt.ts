import { MeshBasicMaterial, type CanvasTexture, type Texture } from 'three'
import { mulberry32 } from '@/utils/math/random'
import { createPixelTexture } from './pixelTexture'

export type Rgb = [number, number, number]

const channel = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

/** `size * size` colors (row by row): `base` with a random brightness shift per pixel. */
export function noiseColors(
  base: Rgb,
  seed: number,
  size: number,
  spread: number,
): Rgb[] {
  const rng = mulberry32(seed)
  return Array.from({ length: size * size }, () => {
    const d = (rng() - 0.5) * spread
    return [channel(base[0] + d), channel(base[1] + d), channel(base[2] + d)]
  })
}

export function paintNoise(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: Rgb,
  seed: number,
  spread = 28,
) {
  noiseColors(base, seed, size, spread).forEach(([r, g, b], i) => {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    ctx.fillRect(i % size, Math.floor(i / size), 1, 1)
  })
}

export function noiseTexture(
  base: Rgb,
  {
    seed = 1,
    size = 8,
    spread = 28,
  }: { seed?: number; size?: number; spread?: number } = {},
): CanvasTexture {
  return createPixelTexture(size, (ctx) => paintNoise(ctx, size, base, seed, spread))
}

/** Classic per-face brightness: top brightest, bottom darkest. */
export const DEFAULT_SHADES = { top: 255, bottom: 120, eastWest: 205, northSouth: 165 }

/**
 * Six materials for a unit box, in three.js face order (+x, -x, +y, -y, +z, -z),
 * shaded per face. Unlit, so it needs no lights and works inside portals.
 */
export function blockMaterials(
  { top, side, bottom = side }: { top: Texture; side: Texture; bottom?: Texture },
  shades = DEFAULT_SHADES,
) {
  const face = (map: Texture, v: number) =>
    new MeshBasicMaterial({ map, color: `rgb(${v}, ${v}, ${v})` })
  return [
    face(side, shades.eastWest),
    face(side, shades.eastWest),
    face(top, shades.top),
    face(bottom, shades.bottom),
    face(side, shades.northSouth),
    face(side, shades.northSouth),
  ]
}

/** Shaded block materials in one flat color, for characters and props built from boxes. */
export function solidBlockMaterials(color: string, shades = DEFAULT_SHADES) {
  const texture = createPixelTexture(1, (ctx) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
  })
  return blockMaterials({ top: texture, side: texture }, shades)
}
