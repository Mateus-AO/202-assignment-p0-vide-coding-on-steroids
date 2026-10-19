import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { lerp } from '@/utils/math'
import {
  heroCheer,
  heroSquash,
  heroStride,
  heroTravel,
  heroTurn,
  heroX,
  heroY,
  heroZ,
  jumpProgress,
  runPhase,
} from './hero'
import { shadedBox as box } from './shaded'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & {
  materials: PlatformerMaterials
  /** Reduced motion: no bobbing, squash or stretch, and the limbs swing half as far. */
  calm: boolean
}

/** Arms up and legs apart in the air; arms thrown straight up when he reaches the goal. */
const ARMS_AIR = [-2.5, -2.2]
const LEGS_AIR = [0.9, -0.5]
const ARMS_CHEER = -2.9

/**
 * Original plumber-style hero made of boxes. Position and pose come only from progress: the
 * stride follows the distance he has run (so he stops when scrolling stops), and the squash,
 * stretch and cheer follow his x.
 */
export function Hero({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const legs = useRef<(Group | null)[]>([])
  const arms = useRef<(Group | null)[]>([])
  const swing = calm ? 0.5 : 1

  useFrame(() => {
    const r = root.current
    if (!r) return
    const u = getU()
    const x = heroX(u)
    const y = heroY(x)
    const z = heroZ(u)
    const air = jumpProgress(x) >= 0
    const stride = heroStride(u)
    const phase = runPhase(heroTravel(u))
    const sine = Math.sin(phase)
    const cheer = air ? 0 : heroCheer(x)

    const squash = calm ? 0 : heroSquash(x)
    const sy = 1 + squash
    const sxz = 1 / Math.sqrt(sy)
    r.position.set(x, y + (air || calm ? 0 : Math.abs(sine) * 0.07 * stride), z)
    r.rotation.y = heroTurn(u)
    r.rotation.z = air ? -0.12 : -0.05 * stride
    r.scale.set(sxz, sy, sxz)

    legs.current.forEach((leg, i) => {
      if (leg)
        leg.rotation.z = air
          ? LEGS_AIR[i]
          : Math.sin(phase + i * Math.PI) * 0.85 * stride * swing
    })
    arms.current.forEach((arm, i) => {
      if (!arm) return
      const run = Math.sin(phase + (i + 1) * Math.PI) * 0.8 * stride * swing
      arm.rotation.z = lerp(air ? ARMS_AIR[i] : run, ARMS_CHEER, cheer)
    })
    if (head.current) {
      // A nod with each stride, and the chin up while he rises.
      head.current.rotation.z = calm
        ? 0
        : Math.sin(phase * 2) * 0.04 * stride - (air ? 0.08 : 0)
    }
    if (shadow.current) {
      const s = 1 / (1 + 0.16 * y)
      shadow.current.position.set(x, 0.02, z)
      shadow.current.scale.set(1.5 * s, 0.9 * s, 1)
    }
  })

  return (
    <>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} material={m.shadow}>
        <circleGeometry args={[0.5, 12]} />
      </mesh>
      <group ref={root}>
        {/* 3/4 view so the +x face (the front) shows to the camera. */}
        <group rotation-y={-0.55}>
          {[-0.19, 0.19].map((z, i) => (
            <group
              key={z}
              ref={(g) => void (legs.current[i] = g)}
              position={[0, 0.72, z]}
            >
              <mesh
                position={[0, -0.25, 0]}
                material={m.blue}
                geometry={box(0.34, 0.5, 0.34)}
                dispose={null}
              />
              <mesh
                position={[0.1, -0.58, 0]}
                material={m.brown}
                geometry={box(0.55, 0.22, 0.38)}
                dispose={null}
              />
            </group>
          ))}

          <mesh
            position={[0, 0.98, 0]}
            material={m.blue}
            geometry={box(0.7, 0.5, 0.72)}
            dispose={null}
          />
          <mesh
            position={[0, 1.38, 0]}
            material={m.red}
            geometry={box(0.68, 0.45, 0.7)}
            dispose={null}
          />
          {[-0.2, 0.2].map((z) => (
            <mesh
              key={z}
              position={[0.36, 1.3, z]}
              material={m.gold}
              geometry={box(0.06, 0.1, 0.1)}
              dispose={null}
            />
          ))}

          {[-0.43, 0.43].map((z, i) => (
            <group
              key={z}
              ref={(g) => void (arms.current[i] = g)}
              position={[0, 1.55, z]}
            >
              <mesh
                position={[0, -0.25, 0]}
                material={m.red}
                geometry={box(0.24, 0.5, 0.24)}
                dispose={null}
              />
              <mesh
                position={[0, -0.58, 0]}
                material={m.white}
                geometry={box(0.28, 0.2, 0.28)}
                dispose={null}
              />
            </group>
          ))}

          <group ref={head} position={[0, 1.6, 0]}>
            <mesh position={[0, 0.28, 0]} material={m.heroHead}>
              <boxGeometry args={[0.66, 0.62, 0.66]} />
            </mesh>
            <mesh
              position={[-0.37, 0.36, 0]}
              material={m.hair}
              geometry={box(0.12, 0.4, 0.7)}
              dispose={null}
            />
            {[-0.37, 0.37].map((z) => (
              <mesh
                key={z}
                position={[0, 0.3, z]}
                material={m.skin}
                geometry={box(0.14, 0.2, 0.1)}
                dispose={null}
              />
            ))}
            <mesh
              position={[0, 0.66, 0]}
              material={m.red}
              geometry={box(0.72, 0.22, 0.72)}
              dispose={null}
            />
            <mesh
              position={[0.4, 0.55, 0]}
              material={m.darkRed}
              geometry={box(0.3, 0.1, 0.66)}
              dispose={null}
            />
          </group>
        </group>
      </group>
    </>
  )
}
