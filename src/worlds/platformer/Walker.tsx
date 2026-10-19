import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { PlatformerMaterials } from './textures'
import { WALKER_X } from './config'

/** A low, wide, purple crawler with a spiky shell that paces on the hero's path, facing -x. */
export function Walker({ materials: m }: { materials: PlatformerMaterials }) {
  const root = useRef<Group>(null)
  const feet = useRef<(Group | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    root.current?.position.set(WALKER_X + Math.sin(t * 1.1) * 0.7, 0, 0)
    feet.current.forEach((f, i) => {
      if (f) f.position.y = Math.max(0, Math.sin(t * 7 + i * Math.PI)) * 0.12
    })
  })

  return (
    <group ref={root}>
      <group rotation-y={0.6}>
        {[-0.38, 0.38].map((z, i) => (
          <group key={z} ref={(g) => void (feet.current[i] = g)} position={[0, 0, z]}>
            <mesh position={[-0.1, 0.12, 0]} material={m.dark}>
              <boxGeometry args={[0.7, 0.24, 0.32]} />
            </mesh>
          </group>
        ))}
        <mesh position={[-0.1, 0.55, 0]} material={m.walkerHead}>
          <boxGeometry args={[1.0, 0.62, 1.1]} />
        </mesh>
        <mesh position={[0.22, 1.0, 0]} material={m.walkerShell}>
          <boxGeometry args={[0.7, 0.34, 0.95]} />
        </mesh>
        {[-0.32, 0, 0.32].map((z) => (
          <mesh key={z} position={[0.25, 1.3, z]} material={m.spike}>
            <boxGeometry args={[0.2, 0.28, 0.2]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
