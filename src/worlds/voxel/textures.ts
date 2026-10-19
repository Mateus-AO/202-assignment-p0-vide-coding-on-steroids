import { MeshBasicMaterial } from 'three'
import {
  blockMaterials,
  noiseTexture,
  solidBlockMaterials,
  type Rgb,
} from '@/utils/three/pixelArt'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import { mulberry32 } from '@/utils/math/random'

const GRASS: Rgb = [96, 168, 58]
const DIRT: Rgb = [137, 92, 56]
const SAND: Rgb = [222, 208, 142]
const STONE: Rgb = [128, 128, 128]
const noise = (base: Rgb, seed: number, spread = 28) =>
  noiseTexture(base, { seed, size: 16, spread })

/** Dirt with a ragged grass fringe along the top, like the original. */
function grassSide() {
  const dirt = noise(DIRT, 2).image as CanvasImageSource
  const grass = noise(GRASS, 1).image as CanvasImageSource
  return createPixelTexture(16, (ctx) => {
    ctx.drawImage(dirt, 0, 0)
    const rng = mulberry32(5)
    for (let x = 0; x < 16; x++) {
      const rows = 3 + (rng() < 0.4 ? 1 : 0)
      ctx.drawImage(grass, x, 0, 1, rows, x, 0, 1, rows)
    }
  })
}

/** Gray stone with darker flecks and a few ore-colored spots. */
function stoneTexture() {
  const base = noise(STONE, 8, 36).image as CanvasImageSource
  return createPixelTexture(16, (ctx) => {
    ctx.drawImage(base, 0, 0)
    const rng = mulberry32(13)
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(60, 60, 60, 0.55)'
      ctx.fillRect(
        Math.floor(rng() * 16),
        Math.floor(rng() * 16),
        1 + Math.floor(rng() * 2),
        1,
      )
    }
    ctx.fillStyle = '#c8a46a'
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rng() * 11)
      const y = 2 + Math.floor(rng() * 11)
      ctx.fillRect(x, y, 2, 2)
    }
  })
}

/** White bark with dark marks. */
function birchBark() {
  return createPixelTexture(16, (ctx) => {
    ctx.fillStyle = '#d9d6c8'
    ctx.fillRect(0, 0, 16, 16)
    const rng = mulberry32(17)
    ctx.fillStyle = '#3a3a34'
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(
        Math.floor(rng() * 14),
        Math.floor(rng() * 16),
        2 + Math.floor(rng() * 2),
        1,
      )
    }
  })
}

/** One shaded material set per kind of block, plus the unshaded plants and water. */
export function createVoxelMaterials() {
  const dirt = noise(DIRT, 2)
  const wood = noise([102, 77, 44], 3, 18)
  const leaves = noise([46, 125, 42], 6, 34)
  const birchLeaves = noise([104, 158, 52], 9, 34)
  const stone = stoneTexture()
  const bark = birchBark()
  const sand = noise(SAND, 7, 20)
  return {
    grass: blockMaterials({ top: noise(GRASS, 1), side: grassSide(), bottom: dirt }),
    sand: blockMaterials({ top: sand, side: sand }),
    stone: blockMaterials({ top: stone, side: stone }),
    dirt: blockMaterials({ top: dirt, side: dirt }),
    wood: blockMaterials({ top: wood, side: wood }),
    birch: blockMaterials({ top: wood, side: bark }),
    leaves: blockMaterials({ top: leaves, side: leaves }),
    birchLeaves: blockMaterials({ top: birchLeaves, side: birchLeaves }),
    cloud: solidBlockMaterials('#ffffff', {
      top: 255,
      bottom: 196,
      eastWest: 232,
      northSouth: 222,
    }),
    water: new MeshBasicMaterial({
      color: '#3b72e0',
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
    plant: new MeshBasicMaterial({ color: '#ffffff' }),
  }
}
