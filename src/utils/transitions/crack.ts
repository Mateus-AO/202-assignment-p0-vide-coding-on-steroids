import type { Texture } from 'three'
import { mulberry32 } from '@/utils/math/random'
import { createPixelTexture } from '@/utils/three/pixelTexture'

/** Pixels in the order they appear: random walks spreading out from the center. */
export function crackPixelOrder(size: number, seed = 7): [number, number][] {
  const rng = mulberry32(seed)
  const seen = new Set<number>()
  const order: [number, number][] = []
  const walkers = Array.from({ length: 6 }, (_, i) => ({
    x: size / 2,
    y: size / 2,
    angle: (i / 6) * Math.PI * 2 + rng() * 0.6,
    alive: true,
  }))

  for (let step = 0; step < size * 2; step++) {
    for (const w of walkers) {
      if (!w.alive) continue
      w.angle += (rng() - 0.5) * 0.9
      w.x += Math.cos(w.angle)
      w.y += Math.sin(w.angle)
      const px = Math.floor(w.x)
      const py = Math.floor(w.y)
      if (px < 0 || py < 0 || px >= size || py >= size) {
        w.alive = false
        continue
      }
      const key = py * size + px
      if (!seen.has(key)) {
        seen.add(key)
        order.push([px, py])
      }
    }
  }
  return order
}

/** `stages` textures, each with more cracks than the last (like block breaking). */
export function createCrackTextures(stages = 10, size = 16, seed = 7): Texture[] {
  const order = crackPixelOrder(size, seed)
  return Array.from({ length: stages }, (_, stage) => {
    const visible = Math.ceil((order.length * (stage + 1)) / stages)
    return createPixelTexture(size, (ctx) => {
      ctx.fillStyle = 'rgba(15, 15, 15, 0.85)'
      for (const [x, y] of order.slice(0, visible)) ctx.fillRect(x, y, 1, 1)
    })
  })
}
