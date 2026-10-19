import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { crackPixelOrder } from '@/utils/transitions/crack'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import type { Vec3 } from '@/utils/math/types'

const SIZE = 16
const STAGES = 10

type Props = {
  position: Vec3
  size: number
  /** Breaking progress in [0, 1]; the overlay is hidden at 0 and at 1. */
  getProgress: () => number
}

/** Cracks drawn in white, so they read on the black block (the shared overlay's are dark). */
export function WhiteCrack({ position, size, getProgress }: Props) {
  const textures = useMemo(() => {
    const order = crackPixelOrder(SIZE)
    return Array.from({ length: STAGES }, (_, stage) => {
      const visible = Math.ceil((order.length * (stage + 1)) / STAGES)
      return createPixelTexture(SIZE, (ctx) => {
        ctx.fillStyle = 'rgba(240, 240, 240, 0.95)'
        for (const [x, y] of order.slice(0, visible)) ctx.fillRect(x, y, 1, 1)
      })
    })
  }, [])
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)

  useFrame(() => {
    const m = mesh.current
    const mat = material.current
    if (!m || !mat) return
    const p = getProgress()
    m.visible = p > 0 && p < 1
    if (!m.visible) return
    const map = textures[Math.min(STAGES - 1, Math.floor(p * STAGES))]
    if (mat.map !== map) {
      mat.map = map
      mat.needsUpdate = true
    }
  })

  return (
    <mesh ref={mesh} position={position} visible={false}>
      <boxGeometry args={[size * 1.01, size * 1.01, size * 1.01]} />
      <meshBasicMaterial
        ref={material}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
