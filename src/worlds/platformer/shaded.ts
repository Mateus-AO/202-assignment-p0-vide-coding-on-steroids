import { BoxGeometry, BufferAttribute, MeshBasicMaterial } from 'three'
import { DEFAULT_SHADES } from '@/utils/three/pixelArt'

/**
 * A solid-colored box that shades its faces like `solidBlockMaterials` but in ONE draw call: the
 * shade of each face is baked into the vertex colors, and the material only carries the color.
 * Six-material boxes cost six calls each, which added up for the hero and the walker.
 */

/** Face order of a BoxGeometry: +x, -x, +y, -y, +z, -z. */
const FACE_SHADES = [
  DEFAULT_SHADES.eastWest,
  DEFAULT_SHADES.eastWest,
  DEFAULT_SHADES.top,
  DEFAULT_SHADES.bottom,
  DEFAULT_SHADES.northSouth,
  DEFAULT_SHADES.northSouth,
]

/** The same light as a `rgb(v, v, v)` material color: sRGB in, linear out. */
const linear = (v: number) => Math.pow(v / 255, 2.2)

const cache = new Map<string, BoxGeometry>()

/** A shaded box geometry; one is shared by every mesh of the same size. */
export function shadedBox(width: number, height: number, depth: number) {
  const key = `${width}x${height}x${depth}`
  let geometry = cache.get(key)
  if (!geometry) {
    geometry = new BoxGeometry(width, height, depth)
    const colors = new Float32Array(24 * 3)
    FACE_SHADES.forEach((shade, face) => {
      for (let v = 0; v < 4; v++)
        colors.fill(linear(shade), (face * 4 + v) * 3, (face * 4 + v) * 3 + 3)
    })
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    cache.set(key, geometry)
  }
  return geometry
}

/** The material for a `shadedBox` in `color`. */
export const shadedMaterial = (color: string) =>
  new MeshBasicMaterial({ color, vertexColors: true })
