import { useMemo } from 'react'
import { Color } from 'three'
import type { QualityTier } from '@/utils/three/quality'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { mulberry32 } from '@/utils/math/random'
import type { WorldProps } from '@/core/world'
import { Clouds } from './Clouds'
import { Creeper } from './Creeper'
import { Explosion } from './Explosion'
import { Instances, type Item } from './Instances'
import {
  buildPlants,
  buildTrees,
  buildVoxels,
  WATER_Y,
  type Tree,
  type Voxel as VoxelData,
} from './terrain'
import { skyFragment, skyVertex } from './shaders'
import { atmosphere, HORIZON } from './atmosphere'
import { createVoxelMaterials } from './textures'

type Bounds = { x: [number, number]; z: [number, number] }

/** The field is smaller on the low tier. Both reach past where the creature wanders. */
const boundsFor = (quality: QualityTier): Bounds =>
  quality === 'high' ? { x: [-26, 26], z: [-110, 8] } : { x: [-16, 16], z: [-90, 6] }

const FLOWER_COLORS = ['#e5483b', '#f2d13c', '#f4f4f4', '#6a7fe8'].map(
  (c) => new Color(c),
)
const GRASS_TINTS = [0.85, 1, 1.12].map((v) => new Color(0.12 * v, 0.3 * v, 0.07 * v))
const STEM = new Color('#4f8f2f')

const cell = (v: VoxelData): Item => ({ position: [v.x, v.y, v.z], color: v.shade })

type Leaf = { dx: number; dy: number; dz: number }

/** Square layers of leaves: `radius` 2 is 5x5 with the corners cut, 1 is 3x3 (or a plus). */
function leafLayer(y: number, radius: 1 | 2, cutCorners: boolean): Leaf[] {
  const cells: Leaf[] = []
  for (let dx = -radius; dx <= radius; dx++)
    for (let dz = -radius; dz <= radius; dz++) {
      const corner = Math.abs(dx) === radius && Math.abs(dz) === radius
      if (cutCorners && corner) continue
      cells.push({ dx, dy: y, dz })
    }
  return cells
}

const TREES: Record<Tree['kind'], { trunk: number; leaves: Leaf[] }> = {
  oak: {
    trunk: 4,
    leaves: [
      ...leafLayer(3, 2, true),
      ...leafLayer(4, 2, true),
      ...leafLayer(5, 1, false),
      ...leafLayer(6, 1, true),
    ],
  },
  tall: {
    trunk: 6,
    leaves: [
      ...leafLayer(5, 2, true),
      ...leafLayer(6, 2, true),
      ...leafLayer(7, 1, true),
      ...leafLayer(8, 1, true).slice(0, 1),
    ],
  },
  birch: {
    trunk: 5,
    leaves: [
      ...leafLayer(4, 2, true),
      ...leafLayer(5, 1, false),
      ...leafLayer(6, 1, true),
    ],
  },
}

export function Voxel({ getU, quality }: WorldProps) {
  useSceneAtmosphere(atmosphere)

  const materials = useMemo(() => createVoxelMaterials(), [])
  const bounds = useMemo(() => boundsFor(quality), [quality])

  const world = useMemo(() => {
    const voxels = buildVoxels(bounds, quality === 'high' ? 3 : 2)
    const trees = buildTrees(bounds)
    const rng = mulberry32(5)

    const wood: Item[] = []
    const birch: Item[] = []
    const leaves: Item[] = []
    const birchLeaves: Item[] = []
    const blocked = new Set<string>()
    for (const t of trees) {
      const spec = TREES[t.kind]
      blocked.add(`${t.x},${t.z}`)
      const trunk = t.kind === 'birch' ? birch : wood
      for (let h = 1; h <= spec.trunk; h++)
        trunk.push({ position: [t.x, t.groundY + h, t.z] })
      const bucket = t.kind === 'birch' ? birchLeaves : leaves
      for (const { dx, dy, dz } of spec.leaves) {
        if (dx === 0 && dz === 0 && dy <= spec.trunk) continue
        // A few holes so the crowns aren't perfect boxes.
        if (rng() < 0.1) continue
        bucket.push({
          position: [t.x + dx, t.groundY + dy, t.z + dz],
          color: 0.88 + rng() * 0.12,
        })
      }
    }

    const plants = buildPlants(bounds, quality === 'high' ? 1 : 0.4, blocked)
    const stems: Item[] = []
    const heads: Item[] = []
    const tufts: Item[] = []
    const blade = mulberry32(31)
    for (const p of plants) {
      if (p.kind === 'flower') {
        stems.push({
          position: [p.x, p.y + 0.22, p.z],
          scale: [0.1, 0.44, 0.1],
          color: STEM,
        })
        heads.push({
          position: [p.x, p.y + 0.5, p.z],
          scale: [0.3, 0.26, 0.3],
          color: FLOWER_COLORS[p.variant],
        })
      } else {
        for (let i = 0; i < 3; i++) {
          const h = 0.45 + blade() * 0.45
          tufts.push({
            position: [
              p.x + (blade() - 0.5) * 0.7,
              p.y + h / 2,
              p.z + (blade() - 0.5) * 0.7,
            ],
            scale: [0.14, h, 0.14],
            color: GRASS_TINTS[(p.variant + i) % 3],
          })
        }
      }
    }

    return {
      grass: voxels.filter((v) => v.depth === 0 && v.surface === 'grass').map(cell),
      sand: voxels.filter((v) => v.depth === 0 && v.surface === 'sand').map(cell),
      stone: voxels.filter((v) => v.depth === 0 && v.surface === 'stone').map(cell),
      dirt: voxels.filter((v) => v.depth > 0).map(cell),
      wood,
      birch,
      leaves,
      birchLeaves,
      stems,
      heads,
      tufts,
    }
  }, [bounds, quality])

  const skyUniforms = useMemo(() => ({ horizon: { value: new Color(HORIZON) } }), [])

  const centerX = (bounds.x[0] + bounds.x[1]) / 2
  const centerZ = (bounds.z[0] + bounds.z[1]) / 2

  return (
    <group>
      <mesh>
        <sphereGeometry args={[400, 24, 16]} />
        <shaderMaterial
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          side={1}
          depthWrite={false}
          uniforms={skyUniforms}
          fog={false}
        />
      </mesh>
      <Clouds count={quality === 'high' ? 14 : 7} material={materials.cloud} />
      <Creeper getU={getU} />
      <Explosion getU={getU} />
      <Instances items={world.grass} material={materials.grass} />
      <Instances items={world.sand} material={materials.sand} />
      <Instances items={world.stone} material={materials.stone} />
      <Instances items={world.dirt} material={materials.dirt} />
      <Instances items={world.wood} material={materials.wood} />
      <Instances items={world.birch} material={materials.birch} />
      <Instances items={world.leaves} material={materials.leaves} />
      <Instances items={world.birchLeaves} material={materials.birchLeaves} />
      <Instances items={world.tufts} material={materials.plant} />
      <Instances items={world.stems} material={materials.plant} />
      <Instances items={world.heads} material={materials.plant} />
      <mesh
        position={[centerX, WATER_Y, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.water}
        renderOrder={1}
      >
        <planeGeometry args={[bounds.x[1] - bounds.x[0], bounds.z[1] - bounds.z[0]]} />
      </mesh>
    </group>
  )
}
