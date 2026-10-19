import { crackPixelOrder } from './crack'

/** Light enough to read on a black square. */
const CRACK_GREY = 215

/**
 * RGBA bytes of a horizontal strip of `stages` crack textures (each `size` x `size`).
 * Stage k holds the first ceil(n * (k + 1) / stages) crack pixels, so every stage adds
 * to the previous one, like the Minecraft breaking animation. Row-major, `stages * size`
 * wide; lit pixels are opaque light grey, the rest transparent.
 */
export function crackAtlasData(stages = 10, size = 16, seed = 7): Uint8Array {
  const order = crackPixelOrder(size, seed)
  const width = stages * size
  const data = new Uint8Array(width * size * 4)
  for (let stage = 0; stage < stages; stage++) {
    const visible = Math.ceil((order.length * (stage + 1)) / stages)
    for (const [x, y] of order.slice(0, visible)) {
      const i = (y * width + stage * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = CRACK_GREY
      data[i + 3] = 255
    }
  }
  return data
}
