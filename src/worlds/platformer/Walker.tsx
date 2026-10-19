import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { shadedBox as box } from './shaded'
import type { PlatformerMaterials } from './textures'
import { WALKER_X } from './config'
import { heroX, walkerStep, walkerX, walkerYaw } from './hero'

type Props = Pick<WorldProps, 'getU'> & {
  materials: PlatformerMaterials
  /** Reduced motion: it stands where it is and does not waddle. */
  calm: boolean
}

/**
 * A low, wide, purple crawler with a spiky shell that paces on the hero's path. Where it is,
 * which way it faces and how it waddles are all functions of the hero's x (it paces as he runs),
 * so the scene scrubs; it keeps clear of his jump (a test checks).
 */
export function Walker({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const feet = useRef<(Group | null)[]>([])

  useFrame(() => {
    const x = heroX(getU())
    const wx = calm ? WALKER_X : walkerX(x)
    root.current?.position.set(wx, 0, 0)
    if (shadow.current) shadow.current.position.set(wx, 0.02, 0)
    const step = calm ? 0 : walkerStep(x)
    if (body.current) {
      body.current.rotation.y = 0.6 + (calm ? 0 : walkerYaw(x))
      // A little rock side to side and a bounce with each step.
      body.current.rotation.x = Math.sin(step) * 0.05
      body.current.position.y = Math.abs(Math.sin(step)) * 0.05
    }
    feet.current.forEach((f, i) => {
      if (f) f.position.y = Math.max(0, Math.sin(step + i * Math.PI)) * 0.12
    })
  })

  return (
    <>
      <mesh
        ref={shadow}
        rotation-x={-Math.PI / 2}
        scale={[1.7, 1.3, 1]}
        material={m.shadow}
      >
        <circleGeometry args={[0.5, 12]} />
      </mesh>
      <group ref={root}>
        <group ref={body} rotation-y={0.6}>
          {[-0.38, 0.38].map((z, i) => (
            <group key={z} ref={(g) => void (feet.current[i] = g)} position={[0, 0, z]}>
              <mesh
                position={[-0.1, 0.12, 0]}
                material={m.dark}
                geometry={box(0.7, 0.24, 0.32)}
                dispose={null}
              />
            </group>
          ))}
          <mesh position={[-0.1, 0.55, 0]} material={m.walkerHead}>
            <boxGeometry args={[1.0, 0.62, 1.1]} />
          </mesh>
          <mesh
            position={[0.22, 1.0, 0]}
            material={m.walkerShell}
            geometry={box(0.7, 0.34, 0.95)}
            dispose={null}
          />
          {[-0.32, 0, 0.32].map((z) => (
            <mesh
              key={z}
              position={[0.25, 1.3, z]}
              material={m.spike}
              geometry={box(0.2, 0.28, 0.2)}
              dispose={null}
            />
          ))}
        </group>
      </group>
    </>
  )
}
