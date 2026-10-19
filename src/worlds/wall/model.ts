import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SCREEN_H, SCREEN_W } from './layout'

/**
 * One old TV set, drawn in code, in the set's own space: x right, y up, the glass centered on
 * the origin and facing +z. All distances are world units. The whole set is a single
 * geometry; each vertex carries its own color multiplier and how much of the set's tint it
 * takes (`aTone`: rgb, then tint amount), so nine sets cost one draw call.
 */
export const CABINET = { w: 2.04, h: 1.66, front: -0.03, back: -0.8, cy: -0.12 }
/** The glass sits just in front of the bezel; it bulges toward the viewer in the middle. */
export const GLASS_Z = 0.012
export const GLASS_BULGE = 0.075
/** The glass and its raised rim reach this far in front of the cabinet at most. */
export const FRONT_Z = 0.1
/** The neck of the tube reaches this far behind the glass plane. */
export const BACK_Z = -1.95

type Tone = [number, number, number, number]
type Part = { geometry: BufferGeometry; tone: Tone }

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  tone: Tone,
): Part {
  const geometry = new BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed()
  geometry.deleteAttribute('uv')
  return { geometry, tone }
}

/** The tapering rear of the tube: a rectangular frustum from the cabinet back to a neck. */
function frustum(
  w0: number,
  h0: number,
  w1: number,
  h1: number,
  z0: number,
  z1: number,
  cy: number,
  tone: Tone,
): Part {
  const corners = (w: number, h: number, z: number) => [
    [-w / 2, cy + h / 2, z],
    [w / 2, cy + h / 2, z],
    [w / 2, cy - h / 2, z],
    [-w / 2, cy - h / 2, z],
  ]
  const a = corners(w0, h0, z0)
  const b = corners(w1, h1, z1)
  const quad = (p: number[][]) => [p[0], p[1], p[2], p[0], p[2], p[3]]
  // Top, right, bottom and left sides, then the back cap (the front hides in the cabinet).
  const faces = [
    quad([a[1], a[0], b[0], b[1]]),
    quad([a[2], a[1], b[1], b[2]]),
    quad([a[3], a[2], b[2], b[3]]),
    quad([a[0], a[3], b[3], b[0]]),
    quad([b[0], b[3], b[2], b[1]]),
  ]
  const positions = new Float32Array(faces.length * 6 * 3)
  let o = 0
  for (const face of faces) for (const v of face) for (const n of v) positions[o++] = n
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return { geometry, tone }
}

/** Builds the set's body: cabinet, bezel and rim, tube neck, knobs, speaker slats, LED. */
export function createTvBody() {
  const { w, h, front, back, cy } = CABINET
  const depth = front - back
  const rimX = (SCREEN_W + 0.1) / 2
  const rimY = (SCREEN_H + 0.1) / 2
  const rim: Tone = [0.3, 0.3, 0.3, 0.25]
  const parts: Part[] = [
    // The cabinet takes the set's tint fully.
    box(w, h, depth, 0, cy, (front + back) / 2, [1, 1, 1, 1]),
    // A dark plate under the glass and a raised rim around it.
    box(
      SCREEN_W + 0.2,
      SCREEN_H + 0.2,
      0.03,
      0,
      0,
      front + 0.015,
      [0.16, 0.16, 0.17, 0.1],
    ),
    box(0.1, SCREEN_H + 0.2, 0.06, -rimX, 0, 0, rim),
    box(0.1, SCREEN_H + 0.2, 0.06, rimX, 0, 0, rim),
    box(SCREEN_W + 0.2, 0.1, 0.06, 0, rimY, 0, rim),
    box(SCREEN_W + 0.2, 0.1, 0.06, 0, -rimY, 0, rim),
    // The tapering back and a neck behind it.
    frustum(w - 0.2, h - 0.2, 1.0, 0.8, back, back - 0.85, cy, [0.55, 0.55, 0.55, 0.7]),
    box(0.5, 0.42, 0.25, 0, cy, BACK_Z + 0.125, [0.2, 0.2, 0.2, 0.2]),
    // Two knobs and a power LED on the lower strip; speaker slats at the left.
    box(0.13, 0.13, 0.07, 0.56, -0.82, front + 0.03, [0.88, 0.88, 0.85, 0.2]),
    box(0.13, 0.13, 0.07, 0.8, -0.82, front + 0.03, [0.88, 0.88, 0.85, 0.2]),
    box(0.05, 0.05, 0.03, 0.95, -0.82, front + 0.015, [1.0, 0.16, 0.12, 0]),
    ...[0, 1, 2, 3].map((k) =>
      box(
        0.55,
        0.022,
        0.02,
        -0.55,
        -0.77 - k * 0.045,
        front + 0.01,
        [0.14, 0.14, 0.14, 0.2],
      ),
    ),
  ]

  const pieces = parts.map(({ geometry, tone }) => {
    const count = geometry.getAttribute('position').count
    const tones = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) tones.set(tone, i * 4)
    geometry.setAttribute('aTone', new BufferAttribute(tones, 4))
    return geometry
  })
  const merged = mergeGeometries(pieces)
  for (const g of pieces) g.dispose()
  return merged
}
