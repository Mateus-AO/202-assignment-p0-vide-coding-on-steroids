import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh } from 'three'
import { mulberry32 } from '@/utils/math/random'
import type { Vec3 } from '@/utils/math/types'

type Props = {
  position: Vec3
  /** Side length of the volume the debris starts in. */
  spread: number
  size: number
  color: string
  /** Burst progress in [0, 1]; scrubbing is deterministic and reversible. */
  getProgress: () => number
  count?: number
  seed?: number
}

const dummy = new Object3D()

/** A burst of small cubes flying out of a broken block. */
export function VoxelDebris({
  position,
  spread,
  size,
  color,
  getProgress,
  count = 64,
  seed = 11,
}: Props) {
  const mesh = useRef<InstancedMesh>(null)

  const particles = useMemo(() => {
    const rng = mulberry32(seed)
    return Array.from({ length: count }, () => ({
      start: [(rng() - 0.5) * spread, (rng() - 0.5) * spread, (rng() - 0.5) * spread],
      velocity: [(rng() - 0.5) * 8, (rng() - 0.3) * 8, rng() * 7 + 1],
      spin: [rng() * 6, rng() * 6, rng() * 6],
    }))
  }, [count, seed, spread])

  useLayoutEffect(() => {
    if (mesh.current) mesh.current.visible = false
  }, [])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const p = getProgress()
    m.visible = p > 0 && p < 1
    if (!m.visible) return
    const t = p * 1.4
    particles.forEach((d, i) => {
      dummy.position.set(
        position[0] + d.start[0] + d.velocity[0] * t,
        position[1] + d.start[1] + d.velocity[1] * t - 4 * t * t,
        position[2] + d.start[2] + d.velocity[2] * t,
      )
      dummy.rotation.set(d.spin[0] * t, d.spin[1] * t, d.spin[2] * t)
      dummy.scale.setScalar(size * (1 - p * 0.85))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}
