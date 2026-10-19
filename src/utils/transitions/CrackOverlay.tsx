import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { createCrackTextures } from './crack'
import type { Vec3 } from '@/utils/math/types'

type Props = {
  position: Vec3
  size: number
  /** Breaking progress in [0, 1]; 0 hides the overlay. */
  getProgress: () => number
  stages?: number
}

/** Minecraft-style breaking texture laid over a cube. */
export function CrackOverlay({ position, size, getProgress, stages = 10 }: Props) {
  const textures = useMemo(() => createCrackTextures(stages), [stages])
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    if (!mesh.current || !material.current) return
    const p = getProgress()
    mesh.current.visible = p > 0 && p < 1
    if (!mesh.current.visible) return
    const map = textures[Math.min(stages - 1, Math.floor(p * stages))]
    if (material.current.map !== map) {
      material.current.map = map
      material.current.needsUpdate = true
    }
  })

  return (
    <mesh ref={mesh} position={position} visible={false}>
      <boxGeometry args={[size * 1.01, size * 1.01, size * 1.01]} />
      <meshBasicMaterial ref={material} transparent depthWrite={false} />
    </mesh>
  )
}
