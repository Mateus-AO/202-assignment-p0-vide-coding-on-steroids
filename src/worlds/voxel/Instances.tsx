import { useLayoutEffect, useRef } from 'react'
import { Color, Object3D, type InstancedMesh, type Material } from 'three'
import type { Vec3 } from '@/utils/math/types'

export type Item = {
  position: Vec3
  /** Defaults to a unit cube. */
  scale?: Vec3
  /** Multiplies the material color per instance; a number means gray (shade). */
  color?: Color | number
}

type Props = { items: Item[]; material: Material | Material[] }

const dummy = new Object3D()
const tint = new Color()

/** One InstancedMesh of boxes, each with its own position, scale and color tint. */
export function Instances({ items, material }: Props) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    items.forEach(({ position, scale = [1, 1, 1], color = 1 }, i) => {
      dummy.position.set(...position)
      dummy.scale.set(...scale)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(
        i,
        typeof color === 'number' ? tint.setRGB(color, color, color) : color,
      )
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [items])

  if (items.length === 0) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      material={material}
      frustumCulled={false}
    >
      <boxGeometry />
    </instancedMesh>
  )
}
