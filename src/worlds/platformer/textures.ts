import { DoubleSide, MeshBasicMaterial, type Texture } from 'three'
import { mulberry32 } from '@/utils/math/random'
import { blockMaterials, DEFAULT_SHADES, noiseTexture } from '@/utils/three/pixelArt'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import { SKY } from './config'
import { shadedMaterial } from './shaded'

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

/** Colors `a` to `b` at `t`, both as '#rrggbb'. */
function mix(a: string, b: string, t: number) {
  const channel = (hex: string, i: number) =>
    parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)
  const c = [0, 1, 2].map((i) =>
    Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t),
  )
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** Two courses of bricks with mortar, a lit top edge and a shaded bottom edge on every brick. */
function brickTexture(brick: string, mortar: string, light: string, shade: string) {
  return painted(brick, [
    [
      light,
      [
        [0, 1, 3, 1],
        [4, 1, 3, 1],
        [2, 5, 3, 1],
        [6, 5, 2, 1],
        [0, 5, 1, 1],
      ],
    ],
    [
      shade,
      [
        [0, 3, 3, 1],
        [4, 3, 3, 1],
        [2, 7, 3, 1],
        [6, 7, 2, 1],
        [0, 7, 1, 1],
      ],
    ],
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
}

/** A weathered brick: the same courses with a few chipped, lighter and darker bricks. */
function weatheredBrick(seed: number) {
  const rng = mulberry32(seed)
  const base = brickTexture('#b5532a', '#3d1c0e', '#cf6c38', '#8f3f1f')
  const canvas = base.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(rng() * 8)
    const y = Math.floor(rng() * 8)
    ctx.fillStyle = rng() < 0.5 ? '#9c4624' : '#c8642f'
    ctx.fillRect(x, y, 1, 1)
  }
  base.needsUpdate = true
  return base
}

const questionTexture = () =>
  painted('#f2b632', [
    [
      '#ffd96a',
      [
        [1, 1, 6, 1],
        [1, 2, 1, 5],
      ],
    ],
    [
      '#7a4a00',
      [
        [0, 0, 8, 1],
        [0, 7, 8, 1],
        [0, 1, 1, 6],
        [7, 1, 1, 6],
        [2, 2, 4, 1],
        [5, 3, 1, 1],
        [3, 4, 2, 1],
        [3, 6, 2, 1],
      ],
    ],
    [
      '#fff0b0',
      [
        [1, 1, 1, 1],
        [6, 1, 1, 1],
      ],
    ],
  ])

/** A block that has been hit: plain, with a rivet in each corner. */
const usedTexture = () =>
  painted('#8a5a30', [
    [
      '#a87340',
      [
        [1, 1, 6, 1],
        [1, 2, 1, 5],
      ],
    ],
    [
      '#3d2410',
      [
        [0, 0, 8, 1],
        [0, 7, 8, 1],
        [0, 1, 1, 6],
        [7, 1, 1, 6],
        [1, 1, 1, 1],
        [6, 1, 1, 1],
        [1, 6, 1, 1],
        [6, 6, 1, 1],
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
      '#ffffff',
      [
        [1, 2, 2, 2],
        [5, 2, 2, 2],
      ],
    ],
    [
      '#1c2a8c',
      [
        [2, 2, 1, 2],
        [5, 2, 1, 2],
      ],
    ],
    ['#e4936b', [[3, 3, 2, 2]]],
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
    [
      '#f4f4f4',
      [
        [2, 6, 1, 1],
        [5, 6, 1, 1],
      ],
    ],
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

/** The wall of a pipe: a dark edge on each side with a bright highlight stripe. */
const pipeBody = () =>
  painted('#2aa84a', [
    [
      '#7be893',
      [
        [1, 0, 1, 8],
        [2, 0, 1, 8],
      ],
    ],
    ['#58cf75', [[3, 0, 1, 8]]],
    [
      '#145f2b',
      [
        [0, 0, 1, 8],
        [6, 0, 1, 8],
        [7, 0, 1, 8],
      ],
    ],
    ['#1c8a3a', [[5, 0, 1, 8]]],
  ])

/** The pipe's rim: outlined all round, with the same highlight. */
const pipeRim = () =>
  painted('#2aa84a', [
    [
      '#7be893',
      [
        [1, 1, 1, 6],
        [2, 1, 1, 6],
      ],
    ],
    ['#58cf75', [[3, 1, 1, 6]]],
    ['#1c8a3a', [[5, 1, 1, 6]]],
    [
      '#145f2b',
      [
        [0, 0, 8, 1],
        [0, 7, 8, 1],
        [0, 0, 1, 8],
        [7, 0, 1, 8],
        [6, 1, 1, 6],
      ],
    ],
  ])

/**
 * The stepped sky on a quad that fills the screen: bands from the zenith (top) down to the
 * horizon, which sits about two thirds of the way down where the hills and ground start.
 */
const SKY_BANDS = 14
const skyTexture = () =>
  createPixelTexture(SKY_BANDS, (ctx) => {
    for (let row = 0; row < SKY_BANDS; row++) {
      const t = Math.min(1, row / (SKY_BANDS * 0.62))
      ctx.fillStyle = mix(SKY.zenith, SKY.horizon, t * t * (3 - 2 * t))
      ctx.fillRect(0, row, SKY_BANDS, 1)
    }
  })

/** The meadow behind the ground: hazy at the far edge (top row), grassy near. */
const fieldTexture = () =>
  createPixelTexture(8, (ctx) => {
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = mix('#8fd4a0', '#4faa45', row / 7)
      ctx.fillRect(0, row, 8, 1)
    }
  })

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

/** One flat color on every face, drawn in a single call: for small details. */
const flat = (color: string) => new MeshBasicMaterial({ color })

/** Almost no shading between faces: clouds read white all round. */
const CLOUD_SHADES = { top: 255, bottom: 226, eastWest: 246, northSouth: 238 }
/** The deeper ground rows are in shade, darker the deeper they are. */
const DEEP_SHADES = { top: 130, bottom: 70, eastWest: 125, northSouth: 105 }
const DEEPER_SHADES = { top: 90, bottom: 50, eastWest: 78, northSouth: 66 }
const DEEPEST_SHADES = { top: 60, bottom: 35, eastWest: 52, northSouth: 44 }

export function createPlatformerMaterials() {
  const skin = colorTexture('#f1b98a')
  const walkerBody = colorTexture('#6a4fb0')
  const brickA = weatheredBrick(2)
  const brickB = weatheredBrick(9)
  const brickPlain = brickTexture('#b5532a', '#3d1c0e', '#cf6c38', '#8f3f1f')
  const stone = brickTexture('#c9b79c', '#6f6250', '#ddcfb6', '#a89478')
  const hillTex = noiseTexture([70, 170, 60], { seed: 1 })
  const pipeSide = pipeBody()
  const rim = pipeRim()
  return {
    // level
    brick: blockMaterials({ top: brickPlain, side: brickPlain }),
    groundA: blockMaterials({ top: brickA, side: brickA }),
    groundB: blockMaterials({ top: brickB, side: brickB }),
    groundDeep: blockMaterials({ top: brickA, side: brickA }, DEEP_SHADES),
    groundDeeper: blockMaterials({ top: brickB, side: brickB }, DEEPER_SHADES),
    groundDeepest: blockMaterials({ top: brickA, side: brickA }, DEEPEST_SHADES),
    question: blockMaterials({ top: questionTexture(), side: questionTexture() }),
    used: blockMaterials({ top: usedTexture(), side: usedTexture() }),
    castle: blockMaterials({ top: stone, side: stone }),
    hill: blockMaterials({ top: hillTex, side: hillTex }),
    hillFar: blockMaterials({
      top: noiseTexture([120, 196, 110], { seed: 7, spread: 14 }),
      side: noiseTexture([120, 196, 110], { seed: 7, spread: 14 }),
    }),
    mountain: blockMaterials({
      top: noiseTexture([150, 192, 218], { seed: 13, spread: 10 }),
      side: noiseTexture([150, 192, 218], { seed: 13, spread: 10 }),
    }),
    bush: blockMaterials({
      top: noiseTexture([36, 140, 52], { seed: 3 }),
      side: noiseTexture([36, 140, 52], { seed: 3 }),
    }),
    pipe: blockMaterials({ top: rim, side: pipeSide }),
    pipeRim: blockMaterials({ top: rim, side: rim }),
    cloud: blockMaterials(
      {
        top: noiseTexture([255, 255, 255], { seed: 4, spread: 8 }),
        side: noiseTexture([255, 255, 255], { seed: 4, spread: 8 }),
      },
      CLOUD_SHADES,
    ),
    flag: blockMaterials({ top: flagTexture(), side: flagTexture() }),
    pole: shadedMaterial('#e8e8e8'),
    gold: shadedMaterial('#ffd23f'),
    dark: shadedMaterial('#1b1410'),
    // single-call flats for small details
    coin: flat('#ffd23f'),
    coinFace: flat('#ffee8a'),
    doorway: flat('#080508'),
    frame: flat('#a89478'),
    frameLight: flat('#cdbb9c'),
    keystone: flat('#e0d2b4'),
    iron: flat('#3b3b46'),
    wood: flat('#6b4220'),
    woodDark: flat('#432a14'),
    flame: flat('#ff9a2e'),
    flameCore: flat('#ffe27a'),
    earth: flat('#2c150b'),
    // flat, unlit cutouts
    sky: new MeshBasicMaterial({ map: skyTexture(), fog: false, depthWrite: false }),
    field: new MeshBasicMaterial({ map: fieldTexture(), side: DoubleSide }),
    shadow: new MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    spark: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    // hero
    heroHead: withFace(skin, heroFace(), 'px'),
    skin: shadedMaterial('#f1b98a'),
    hair: shadedMaterial('#4a2a12'),
    red: shadedMaterial('#d8312f'),
    darkRed: shadedMaterial('#8f1f1f'),
    blue: shadedMaterial('#2f4fd8'),
    brown: shadedMaterial('#5a3418'),
    white: shadedMaterial('#f4f4f4'),
    // walker
    walkerHead: withFace(walkerBody, walkerFace(), 'nx'),
    walkerShell: shadedMaterial('#4a3585'),
    spike: shadedMaterial('#ffe14d'),
  }
}

export type PlatformerMaterials = ReturnType<typeof createPlatformerMaterials>
