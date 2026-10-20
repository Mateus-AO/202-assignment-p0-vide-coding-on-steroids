import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, type Group, type InstancedMesh } from 'three'
import type { WorldProps } from '@/core/world'
import { mulberry32 } from '@/utils/math/random'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import {
  BLOCK,
  COINS,
  COLS,
  PILLAR,
  PILLARS,
  PIPE,
  ROWS,
  SLAB,
  WALL,
  WALL_SEGMENTS,
} from './arena'
import { sinkAmount } from './cast'
import { flatMaterial, shadedBox as box, shadedMaterial } from './shaded'

const dummy = new Object3D()
const tint = new Color()

/** Flagstones: a lit top and left edge, a dark bottom and right seam, a few worn pixels. */
function flagstone(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#9a94b8'
  ctx.fillRect(0, 0, 8, 8)
  ctx.fillStyle = '#b3add0'
  ctx.fillRect(0, 0, 8, 1)
  ctx.fillRect(0, 0, 1, 8)
  ctx.fillStyle = '#6c6688'
  ctx.fillRect(0, 7, 8, 1)
  ctx.fillRect(7, 0, 1, 8)
  ctx.fillStyle = '#857fa3'
  for (const [x, y] of [
    [3, 2],
    [5, 5],
    [2, 5],
    [4, 3],
  ])
    ctx.fillRect(x, y, 1, 1)
}

/** The floor: one instanced plane per tile, a checker with a little noise and a darker border. */
export function Floor() {
  const mesh = useRef<InstancedMesh>(null)
  const map = useMemo(() => createPixelTexture(8, flagstone), [])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const rng = mulberry32(11)
    let i = 0
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        dummy.position.set(col - COLS / 2 + 0.5, 0, row - ROWS / 2 + 0.5)
        dummy.rotation.set(-Math.PI / 2, 0, 0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        const edge = col === 0 || row === 0 || col === COLS - 1 || row === ROWS - 1
        const v = ((col + row) % 2 ? 0.5 : 0.42) * (edge ? 0.8 : 1) - rng() * 0.06
        m.setColorAt(i, tint.setRGB(v * (edge ? 0.95 : 1), v, v * 1.1))
        i++
      }
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, COLS * ROWS]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} />
    </instancedMesh>
  )
}

const FLAME_BASE = PILLAR.height

/** The low border wall with its gates, and a pillar with a flame at each corner. */
export function Walls({ getU, calm }: Pick<WorldProps, 'getU'> & { calm: boolean }) {
  const walls = useRef<InstancedMesh>(null)
  const pillars = useRef<InstancedMesh>(null)
  const flames = useRef<InstancedMesh>(null)
  const cores = useRef<InstancedMesh>(null)
  const stone = useMemo(() => shadedMaterial('#5d5780'), [])
  const flame = useMemo(() => flatMaterial('#ff9a2e', false), [])
  const core = useMemo(() => flatMaterial('#ffe27a', false), [])

  useLayoutEffect(() => {
    const w = walls.current
    const p = pillars.current
    if (!w || !p) return
    dummy.rotation.set(0, 0, 0)
    WALL_SEGMENTS.forEach((s, i) => {
      dummy.position.set(s.x, WALL.height / 2, s.z)
      dummy.scale.set(s.sx, WALL.height, s.sz)
      dummy.updateMatrix()
      w.setMatrixAt(i, dummy.matrix)
    })
    PILLARS.forEach(([x, z], i) => {
      dummy.position.set(x, PILLAR.height / 2, z)
      dummy.scale.set(PILLAR.size, PILLAR.height, PILLAR.size)
      dummy.updateMatrix()
      p.setMatrixAt(i, dummy.matrix)
    })
    w.instanceMatrix.needsUpdate = true
    p.instanceMatrix.needsUpdate = true
  }, [])

  // The flames lick up and down with the scroll (still when motion is reduced).
  useFrame(() => {
    const f = flames.current
    const c = cores.current
    if (!f || !c) return
    const u = getU()
    PILLARS.forEach(([x, z], i) => {
      const k = calm ? 0 : Math.sin(u * 420 + i * 1.7) * 0.5 + Math.sin(u * 777 + i) * 0.3
      dummy.position.set(x, FLAME_BASE + 0.2 + k * 0.03, z)
      dummy.scale.set(0.3, 0.38 + k * 0.1, 0.3)
      dummy.updateMatrix()
      f.setMatrixAt(i, dummy.matrix)
      dummy.position.set(x, FLAME_BASE + 0.16 + k * 0.02, z)
      dummy.scale.set(0.16, 0.22 + k * 0.06, 0.16)
      dummy.updateMatrix()
      c.setMatrixAt(i, dummy.matrix)
    })
    f.instanceMatrix.needsUpdate = true
    c.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh
        ref={walls}
        args={[undefined, undefined, WALL_SEGMENTS.length]}
        material={stone}
        geometry={box(1, 1, 1)}
        frustumCulled={false}
      />
      <instancedMesh
        ref={pillars}
        args={[undefined, undefined, PILLARS.length]}
        material={stone}
        geometry={box(1, 1, 1)}
        frustumCulled={false}
      />
      <instancedMesh
        ref={flames}
        args={[undefined, undefined, PILLARS.length]}
        material={flame}
        geometry={box(1, 1, 1)}
        frustumCulled={false}
      />
      <instancedMesh
        ref={cores}
        args={[undefined, undefined, PILLARS.length]}
        material={core}
        geometry={box(1, 1, 1)}
        frustumCulled={false}
      />
    </>
  )
}

/** "?" in a 4 x 5 grid, drawn on top of the block (the top row is the back). */
const QUESTION = ['.##.', '#..#', '..#.', '....', '..#.']
const QUESTION_CELL = 0.12
const QUESTION_CELLS = QUESTION.flatMap((row, r) =>
  [...row].flatMap((ch, c) =>
    ch === '#'
      ? [[(c - 1.5) * QUESTION_CELL, (r - 2) * QUESTION_CELL] as [number, number]]
      : [],
  ),
)

/**
 * The props: a question block against the back wall with coins turning over it, and the pipe
 * and the bumper the party plays with, which sink into the floor as the merge begins.
 */
export function Props({ getU, calm }: Pick<WorldProps, 'getU'> & { calm: boolean }) {
  const materials = useMemo(
    () => ({
      gold: shadedMaterial('#f2b632'),
      mark: flatMaterial('#7a4a00'),
      rivet: flatMaterial('#fff0b0'),
      coin: flatMaterial('#ffd23f'),
      coinFace: flatMaterial('#ffee8a'),
      // Cylinders carry no baked face shading, so they use flat colors.
      pipe: flatMaterial('#23963f'),
      rim: flatMaterial('#58cf75'),
      hole: flatMaterial('#0a2a12'),
      slab: shadedMaterial('#b7a97c'),
    }),
    [],
  )
  const pipe = useRef<Group>(null)
  const slab = useRef<Group>(null)
  const coins = useRef<(Group | null)[]>([])

  useFrame(() => {
    const u = getU()
    const sink = sinkAmount(u)
    if (pipe.current) {
      pipe.current.position.y = -sink * (PIPE.height + 0.5)
      pipe.current.visible = sink < 0.999
    }
    if (slab.current) {
      slab.current.position.y = -sink * (SLAB.height + 0.3)
      slab.current.visible = sink < 0.999
    }
    coins.current.forEach((c, i) => {
      if (!c) return
      c.rotation.y = calm ? 0.5 : u * 24 + i * 1.3
      c.position.y = 1.25 + (calm ? 0 : Math.sin(u * 40 + i * 2) * 0.08)
    })
  })

  return (
    <>
      <group position={[BLOCK.x, 0, BLOCK.z]}>
        <mesh
          position={[0, BLOCK.size / 2, 0]}
          material={materials.gold}
          geometry={box(BLOCK.size, BLOCK.size, BLOCK.size)}
          dispose={null}
        />
        {QUESTION_CELLS.map(([x, z]) => (
          <mesh
            key={`${x},${z}`}
            position={[x, BLOCK.size + 0.005, z]}
            material={materials.mark}
            geometry={box(QUESTION_CELL, 0.01, QUESTION_CELL)}
            dispose={null}
          />
        ))}
        {([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`${sx},${sz}`}
              position={[sx * 0.32, BLOCK.size + 0.005, sz * 0.32]}
              material={materials.rivet}
              geometry={box(0.07, 0.01, 0.07)}
              dispose={null}
            />
          )),
        )}
      </group>
      {COINS.map(([x, z], i) => (
        <group key={x} position={[x, 1.25, z]} ref={(g) => void (coins.current[i] = g)}>
          <mesh rotation-x={Math.PI / 2} material={materials.coin}>
            <cylinderGeometry args={[0.26, 0.26, 0.07, 14]} />
          </mesh>
          <mesh
            rotation-x={Math.PI / 2}
            position={[0, 0, 0.04]}
            material={materials.coinFace}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.02, 12]} />
          </mesh>
        </group>
      ))}
      <group ref={pipe} position={[PIPE.x, 0, PIPE.z]}>
        <mesh position={[0, PIPE.height / 2, 0]} material={materials.pipe}>
          <cylinderGeometry args={[PIPE.radius, PIPE.radius, PIPE.height, 16]} />
        </mesh>
        <mesh position={[0, PIPE.height + 0.08, 0]} material={materials.rim}>
          <cylinderGeometry args={[PIPE.radius + 0.08, PIPE.radius + 0.08, 0.2, 16]} />
        </mesh>
        <mesh
          position={[0, PIPE.height + 0.19, 0]}
          rotation-x={-Math.PI / 2}
          material={materials.hole}
        >
          <circleGeometry args={[PIPE.radius - 0.1, 16]} />
        </mesh>
      </group>
      <group ref={slab} position={[SLAB.x, 0, SLAB.z]}>
        <mesh
          position={[0, SLAB.height / 2, 0]}
          material={materials.slab}
          geometry={box(SLAB.thickness, SLAB.height, SLAB.length)}
          dispose={null}
        />
      </group>
    </>
  )
}
