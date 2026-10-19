import { useLayoutEffect, useRef } from 'react'
import { Color, Object3D, type InstancedMesh, type Material } from 'three'
import { mulberry32 } from '@/utils/math/random'

export type Cell = [number, number, number]

type Props = {
  cells: Cell[]
  material: Material | Material[]
  /** Each block gets a brightness tint in [1 - tint, 1] so flat areas aren't uniform. */
  tint?: number
}

/** One InstancedMesh of unit cubes centered on each cell. */
export function InstancedBlocks({ cells, material, tint = 0.1 }: Props) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new Object3D()
    const rng = mulberry32(3)
    const color = new Color()
    cells.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      const v = 1 - rng() * tint
      m.setColorAt(i, color.setRGB(v, v, v))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [cells, tint])

  if (cells.length === 0) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, cells.length]}
      material={material}
      frustumCulled={false}
    >
      <boxGeometry />
    </instancedMesh>
  )
}
