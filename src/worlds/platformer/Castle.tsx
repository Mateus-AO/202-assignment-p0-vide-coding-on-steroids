import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh, type Material, type Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import {
  CASTLE_X,
  DETAIL,
  DOOR_FRAME_DEPTH,
  DOOR_FRAME_WIDTH,
  DOOR_HALF_WIDTH,
  DOOR_TOP,
  DOOR_Z,
} from './config'
import type { QualityTier } from '@/utils/three/quality'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & {
  materials: PlatformerMaterials
  quality: QualityTier
  calm: boolean
}

/** The castle's front face (its bricks are instanced in scenery.ts). */
const WALL_FRONT = 0.5
const FRAME_Z = WALL_FRONT + DOOR_FRAME_DEPTH / 2
const FRAME_FRONT = WALL_FRONT + DOOR_FRAME_DEPTH

/** The doorway narrows in steps toward the top: a half width at each height range. */
const ARCH = [
  { from: DOOR_TOP, to: DOOR_TOP + 0.3, half: DOOR_HALF_WIDTH - 0.2 },
  { from: DOOR_TOP + 0.3, to: DOOR_TOP + 0.55, half: DOOR_HALF_WIDTH - 0.4 },
]
const ARCH_TOP = ARCH[ARCH.length - 1].to
const FRAME_WIDTH = DOOR_FRAME_WIDTH
const LINTEL = 0.35

function Slab({
  at,
  size,
  material,
}: {
  at: [number, number, number]
  size: [number, number, number]
  material: Material | Material[]
}) {
  return (
    <mesh position={at} material={material}>
      <boxGeometry args={size} />
    </mesh>
  )
}

/** Both sides at once: the same slab mirrored about the door's center line. */
function Pair({
  dx,
  y,
  z,
  size,
  material,
}: {
  dx: number
  y: number
  z: number
  size: [number, number, number]
  material: Material | Material[]
}) {
  return (
    <>
      <Slab at={[CASTLE_X - dx, y, z]} size={size} material={material} />
      <Slab at={[CASTLE_X + dx, y, z]} size={size} material={material} />
    </>
  )
}

const dummy = new Object3D()
const STUDS: [number, number][] = [
  // along the lintel, then three down each jamb (x offset from the door's center, y)
  ...[-0.8, -0.48, -0.16, 0.16, 0.48, 0.8].map((x): [number, number] => [
    x,
    ARCH_TOP + 0.17,
  ]),
  ...[0.5, 1.1, 1.7].flatMap((y): [number, number][] => [
    [-(DOOR_HALF_WIDTH + FRAME_WIDTH / 2), y],
    [DOOR_HALF_WIDTH + FRAME_WIDTH / 2, y],
  ]),
]

/** Iron studs on the stone surround: one instanced mesh. */
function Studs({ material }: { material: Material }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const inst = mesh.current
    if (!inst) return
    STUDS.forEach(([x, y], i) => {
      dummy.position.set(CASTLE_X + x, y, FRAME_FRONT + 0.01)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, STUDS.length]}
      material={material}
      frustumCulled={false}
    >
      <boxGeometry args={[0.1, 0.1, 0.05]} />
    </instancedMesh>
  )
}

/** A wall torch: a bracket and a two-tone flame that flickers with the scroll. */
function Torch({
  x,
  flicker,
  materials: m,
}: {
  x: number
  flicker: (flame: Mesh) => void
  materials: PlatformerMaterials
}) {
  const flame = useRef<Mesh>(null)
  useFrame(() => {
    if (flame.current) flicker(flame.current)
  })
  return (
    <group position={[x, 1.75, WALL_FRONT + 0.1]}>
      <mesh position={[0, -0.2, 0]} material={m.woodDark}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
      </mesh>
      <mesh position={[0, 0.1, 0.02]} material={m.iron}>
        <boxGeometry args={[0.22, 0.1, 0.22]} />
      </mesh>
      <mesh ref={flame} position={[0, 0.3, 0.02]} material={m.flame}>
        <boxGeometry args={[0.2, 0.3, 0.2]} />
      </mesh>
      <mesh position={[0, 0.27, 0.12]} material={m.flameCore}>
        <boxGeometry args={[0.1, 0.18, 0.04]} />
      </mesh>
    </group>
  )
}

/**
 * The castle's gate and windows. The doorway is a dark opening set back in a stone surround that
 * stands out from the wall: a stepped arch, a keystone, jambs with studs, a raised portcullis and
 * a torch on each side. The dark face of the doorway (`DOOR_Z`) is what the dolly ends in front
 * of and what the hero walks into; nothing sits in front of it inside the dolly's view.
 */
export function CastleDetails({ getU, materials: m, quality, calm }: Props) {
  const detail = DETAIL[quality]
  const doorWidth = DOOR_HALF_WIDTH * 2
  const frameHalf = DOOR_HALF_WIDTH + FRAME_WIDTH
  const archWidth = (half: number) => half * 2
  const faceZ = DOOR_Z - 0.04

  return (
    <>
      {/* The dark of the doorway, stepped like the arch above it. */}
      <Slab
        at={[CASTLE_X, DOOR_TOP / 2, faceZ]}
        size={[doorWidth, DOOR_TOP, 0.08]}
        material={m.doorway}
      />
      {ARCH.map(({ from, to, half }) => (
        <Slab
          key={from}
          at={[CASTLE_X, (from + to) / 2, faceZ]}
          size={[archWidth(half), to - from, 0.08]}
          material={m.doorway}
        />
      ))}

      {/* The stone surround: jambs, the arch's shoulders, a lintel and a keystone. */}
      <Pair
        dx={DOOR_HALF_WIDTH + FRAME_WIDTH / 2}
        y={DOOR_TOP / 2}
        z={FRAME_Z}
        size={[FRAME_WIDTH, DOOR_TOP, DOOR_FRAME_DEPTH]}
        material={m.frame}
      />
      {ARCH.map(({ from, to, half }) => (
        <Pair
          key={from}
          dx={(half + frameHalf) / 2}
          y={(from + to) / 2}
          z={FRAME_Z}
          size={[frameHalf - half, to - from, DOOR_FRAME_DEPTH]}
          material={m.frame}
        />
      ))}
      <Slab
        at={[CASTLE_X, ARCH_TOP + LINTEL / 2, FRAME_Z]}
        size={[frameHalf * 2, LINTEL, DOOR_FRAME_DEPTH]}
        material={m.frameLight}
      />
      <Slab
        at={[CASTLE_X, ARCH_TOP + LINTEL / 2, FRAME_Z + 0.03]}
        size={[0.4, LINTEL, DOOR_FRAME_DEPTH + 0.06]}
        material={m.keystone}
      />
      <Studs material={m.iron} />

      {/* A raised portcullis: its bars hang in the arch above the head of the doorway. */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
        <Slab
          key={x}
          at={[CASTLE_X + x, DOOR_TOP + 0.3, WALL_FRONT + 0.12]}
          size={[0.06, 0.6, 0.06]}
          material={m.iron}
        />
      ))}
      <Slab
        at={[CASTLE_X, DOOR_TOP + 0.2, WALL_FRONT + 0.12]}
        size={[doorWidth - 0.1, 0.08, 0.07]}
        material={m.iron}
      />

      {detail.torches && (
        <>
          {[-1, 1].map((side) => (
            <Torch
              key={side}
              x={CASTLE_X + side * (frameHalf + 0.6)}
              materials={m}
              flicker={(flame) => {
                // Moves with the scroll, never on its own, and not at all under reduced motion.
                flame.scale.y = calm ? 1 : 1 + 0.18 * Math.sin(getU() * 900 + side)
              }}
            />
          ))}
        </>
      )}

      {/* Windows: the tower's, and a slit on each side of the gate. */}
      <Slab at={[CASTLE_X, 5.5, 0.01]} size={[0.8, 1.1, 0.04]} material={m.frame} />
      <Slab at={[CASTLE_X, 5.5, 0.04]} size={[0.56, 0.86, 0.06]} material={m.doorway} />
      <Slab at={[CASTLE_X, 6.12, 0.04]} size={[0.32, 0.4, 0.06]} material={m.doorway} />
      <Pair
        dx={2.1}
        y={3}
        z={WALL_FRONT + 0.015}
        size={[0.7, 1.1, 0.03]}
        material={m.frame}
      />
      <Pair
        dx={2.1}
        y={3}
        z={WALL_FRONT + 0.04}
        size={[0.4, 0.8, 0.04]}
        material={m.doorway}
      />
    </>
  )
}
