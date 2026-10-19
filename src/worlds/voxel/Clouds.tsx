import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh, type Material } from 'three'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { mulberry32 } from '@/utils/math/random'

/** Stepped pixel clouds: each is a few boxes as [dx, dy, dz, width, height, depth]. */
const SHAPES: [number, number, number, number, number, number][][] = [
  [
    [0, 0, 0, 14, 1.6, 6],
    [1.5, 1.6, 0.4, 8, 1.4, 4.5],
    [-5, 0.4, -1, 5, 1.2, 4],
  ],
  [
    [0, 0, 0, 10, 1.5, 5],
    [-1, 1.5, 0, 5, 1.5, 4],
    [4.5, 0.3, 1, 4, 1.2, 3],
  ],
  [
    [0, 0, 0, 18, 1.4, 7],
    [3, 1.4, 0.5, 9, 1.4, 5],
    [-4, 1.4, 0, 4, 1.2, 4],
    [-8, 0.4, -1, 4, 1.0, 3],
  ],
]

const SPAN = 110
const SEGMENTS = Math.max(...SHAPES.map((s) => s.length))

type Cloud = { x: number; y: number; z: number; speed: number; shape: number }

const dummy = new Object3D()

/**
 * Clouds drifting slowly along +x. They wrap far out where the fog has already turned
 * them into the horizon color, so the wrap is never seen. Still under reduced motion.
 */
export function Clouds({ count, material }: { count: number; material: Material[] }) {
  const mesh = useRef<InstancedMesh>(null)
  const reduced = usePrefersReducedMotion()

  const clouds = useMemo<Cloud[]>(() => {
    const rng = mulberry32(21)
    return Array.from({ length: count }, () => ({
      x: (rng() - 0.5) * 2 * SPAN,
      y: 26 + rng() * 8,
      z: 10 - rng() * 130,
      speed: 0.35 + rng() * 0.5,
      shape: Math.floor(rng() * SHAPES.length),
    }))
  }, [count])

  const place = (time: number) => {
    const m = mesh.current
    if (!m) return
    let i = 0
    for (const c of clouds) {
      const x =
        ((((c.x + time * c.speed + SPAN) % (2 * SPAN)) + 2 * SPAN) % (2 * SPAN)) - SPAN
      for (const [dx, dy, dz, w, h, d] of SHAPES[c.shape]) {
        dummy.position.set(x + dx, c.y + dy, c.z + dz)
        dummy.scale.set(w, h, d)
        dummy.updateMatrix()
        m.setMatrixAt(i++, dummy.matrix)
      }
    }
    // Unused slots collapse to nothing.
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    while (i < clouds.length * SEGMENTS) m.setMatrixAt(i++, dummy.matrix)
    m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0))

  useFrame(({ clock }) => {
    if (!reduced) place(clock.elapsedTime)
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, clouds.length * SEGMENTS]}
      material={material}
      frustumCulled={false}
    >
      <boxGeometry />
    </instancedMesh>
  )
}
