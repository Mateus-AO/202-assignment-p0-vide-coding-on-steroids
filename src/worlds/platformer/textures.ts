import { MeshBasicMaterial, type Texture } from 'three'
import {
  blockMaterials,
  DEFAULT_SHADES,
  noiseTexture,
  solidBlockMaterials,
} from '@/utils/three/pixelArt'
import { createPixelTexture } from '@/utils/three/pixelTexture'

type Rect = [x: number, y: number, w: number, h: number]

/** 8x8 texture: `base` fill, then rectangles of other colors drawn on top. */
function painted(base: string, layers: [color: string, rects: Rect[]][]) {
  return createPixelTexture(8, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 8, 8)
    for (const [color, rects] of layers) {
      ctx.fillStyle = color
      for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h)
    }
  })
}

const brickTexture = (brick: string, mortar: string) =>
  painted(brick, [
    [
      mortar,
      [
        [0, 0, 8, 1],
        [0, 4, 8, 1],
        [3, 1, 1, 3],
        [7, 1, 1, 3],
        [1, 5, 1, 3],
        [5, 5, 1, 3],
      ],
    ],
  ])

const questionTexture = () =>
  painted('#f2b632', [
    [
      '#7a4a00',
      [
        [0, 0, 8, 1],
        [0, 7, 8, 1],
        [2, 2, 4, 1],
        [5, 3, 1, 1],
        [3, 4, 2, 1],
        [3, 6, 2, 1],
      ],
    ],
  ])

/** Frontal face on the +x side of the hero's head: sideburns, eyes, nose, mustache. */
const heroFace = () =>
  painted('#f1b98a', [
    [
      '#4a2a12',
      [
        [0, 1, 1, 4],
        [7, 1, 1, 4],
        [1, 0, 6, 1],
      ],
    ],
    [
      '#1a1a1a',
      [
        [2, 2, 1, 2],
        [5, 2, 1, 2],
      ],
    ],
    ['#e4936b', [[3, 4, 2, 1]]],
    [
      '#4a2a12',
      [
        [1, 5, 6, 1],
        [2, 6, 4, 1],
      ],
    ],
  ])

/** Angry yellow eyes and little fangs on the -x side of the walker. */
const walkerFace = () =>
  painted('#9b4a2b', [
    [
      '#2a120a',
      [
        [0, 2, 3, 1],
        [5, 2, 3, 1],
        [1, 3, 2, 1],
        [5, 3, 2, 1],
      ],
    ],
    [
      '#ffd84d',
      [
        [1, 4, 2, 2],
        [5, 4, 2, 2],
      ],
    ],
    [
      '#1a1a1a',
      [
        [2, 4, 1, 2],
        [5, 4, 1, 2],
      ],
    ],
    ['#2a120a', [[2, 7, 4, 1]]],
  ])

const flagTexture = () =>
  painted('#2fb36b', [
    [
      '#ffffff',
      [
        [3, 2, 2, 4],
        [2, 3, 4, 2],
      ],
    ],
    [
      '#1f7d49',
      [
        [0, 0, 8, 1],
        [0, 7, 8, 1],
      ],
    ],
  ])

/** The material set of a box whose +x or -x face shows `face` and everything else `base`. */
function withFace(base: Texture, face: Texture, side: 'px' | 'nx') {
  const mats = blockMaterials({ top: base, side: base })
  const shade = DEFAULT_SHADES.eastWest
  mats[side === 'px' ? 0 : 1] = new MeshBasicMaterial({
    map: face,
    color: `rgb(${shade}, ${shade}, ${shade})`,
  })
  return mats
}

const colorTexture = (hex: string) =>
  createPixelTexture(1, (ctx) => {
    ctx.fillStyle = hex
    ctx.fillRect(0, 0, 1, 1)
  })

export function createPlatformerMaterials() {
  const skin = colorTexture('#f1b98a')
  const walkerBody = colorTexture('#6a4fb0')
  return {
    brick: blockMaterials({
      top: brickTexture('#b5532a', '#3d1c0e'),
      side: brickTexture('#b5532a', '#3d1c0e'),
    }),
    question: blockMaterials({ top: questionTexture(), side: questionTexture() }),
    castle: blockMaterials({
      top: brickTexture('#c9b79c', '#6f6250'),
      side: brickTexture('#c9b79c', '#6f6250'),
    }),
    hill: blockMaterials({
      top: noiseTexture([70, 170, 60], { seed: 1 }),
      side: noiseTexture([70, 170, 60], { seed: 1 }),
    }),
    hillFar: blockMaterials({
      top: noiseTexture([120, 196, 110], { seed: 7, spread: 14 }),
      side: noiseTexture([120, 196, 110], { seed: 7, spread: 14 }),
    }),
    bush: blockMaterials({
      top: noiseTexture([36, 140, 52], { seed: 3 }),
      side: noiseTexture([36, 140, 52], { seed: 3 }),
    }),
    pipe: blockMaterials({
      top: noiseTexture([40, 160, 70], { seed: 2, spread: 16 }),
      side: noiseTexture([40, 160, 70], { seed: 2, spread: 16 }),
    }),
    cloud: blockMaterials({
      top: noiseTexture([252, 252, 255], { seed: 4, spread: 8 }),
      side: noiseTexture([252, 252, 255], { seed: 4, spread: 8 }),
    }),
    flag: blockMaterials({ top: flagTexture(), side: flagTexture() }),
    pole: solidBlockMaterials('#e8e8e8'),
    gold: solidBlockMaterials('#ffd23f'),
    dark: solidBlockMaterials('#1b1410'),
    // hero
    heroHead: withFace(skin, heroFace(), 'px'),
    skin: solidBlockMaterials('#f1b98a'),
    red: solidBlockMaterials('#d8312f'),
    darkRed: solidBlockMaterials('#8f1f1f'),
    blue: solidBlockMaterials('#2f4fd8'),
    brown: solidBlockMaterials('#5a3418'),
    white: solidBlockMaterials('#f4f4f4'),
    // walker
    walkerHead: withFace(walkerBody, walkerFace(), 'nx'),
    walkerShell: solidBlockMaterials('#4a3585'),
    spike: solidBlockMaterials('#ffe14d'),
  }
}

export type PlatformerMaterials = ReturnType<typeof createPlatformerMaterials>
