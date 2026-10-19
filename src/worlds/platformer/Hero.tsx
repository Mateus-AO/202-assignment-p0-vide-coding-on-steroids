import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { WorldProps } from '@/core/world'
import { heroTravel, heroTurn, heroX, heroY, heroZ, runPhase } from './hero'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & { materials: PlatformerMaterials }

/** Original plumber-style hero made of boxes; pose and position come only from progress. */
export function Hero({ getU, materials: m }: Props) {
  const root = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const arms = useRef<(Group | null)[]>([])

  useFrame(() => {
    const r = root.current
    if (!r) return
    const u = getU()
    const x = heroX(u)
    const y = heroY(x)
    const air = y > 0.02
    const phase = runPhase(heroTravel(u))

    r.position.set(x, y + (air ? 0 : Math.abs(Math.sin(phase)) * 0.07), heroZ(u))
    r.rotation.y = heroTurn(u)
    r.rotation.z = air ? -0.12 : -0.05

    legs.current.forEach((leg, i) => {
      if (leg)
        leg.rotation.z = air
          ? i === 0
            ? 0.9
            : -0.5
          : Math.sin(phase + i * Math.PI) * 0.85
    })
    arms.current.forEach((arm, i) => {
      if (arm)
        arm.rotation.z = air
          ? i === 0
            ? -2.5
            : -2.2
          : Math.sin(phase + (i + 1) * Math.PI) * 0.8
    })
  })

  return (
    <group ref={root}>
      {/* 3/4 view so the +x face (the front) shows to the camera. */}
      <group rotation-y={-0.55}>
        {[-0.19, 0.19].map((z, i) => (
          <group key={z} ref={(g) => void (legs.current[i] = g)} position={[0, 0.72, z]}>
            <mesh position={[0, -0.25, 0]} material={m.blue}>
              <boxGeometry args={[0.34, 0.5, 0.34]} />
            </mesh>
            <mesh position={[0.1, -0.58, 0]} material={m.brown}>
              <boxGeometry args={[0.55, 0.22, 0.38]} />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 0.98, 0]} material={m.blue}>
          <boxGeometry args={[0.7, 0.5, 0.72]} />
        </mesh>
        <mesh position={[0, 1.38, 0]} material={m.red}>
          <boxGeometry args={[0.68, 0.45, 0.7]} />
        </mesh>
        {[-0.2, 0.2].map((z) => (
          <mesh key={z} position={[0.36, 1.3, z]} material={m.gold}>
            <boxGeometry args={[0.06, 0.1, 0.1]} />
          </mesh>
        ))}

        {[-0.43, 0.43].map((z, i) => (
          <group key={z} ref={(g) => void (arms.current[i] = g)} position={[0, 1.55, z]}>
            <mesh position={[0, -0.25, 0]} material={m.red}>
              <boxGeometry args={[0.24, 0.5, 0.24]} />
            </mesh>
            <mesh position={[0, -0.58, 0]} material={m.white}>
              <boxGeometry args={[0.28, 0.2, 0.28]} />
            </mesh>
          </group>
        ))}

        <mesh position={[0, 1.88, 0]} material={m.heroHead}>
          <boxGeometry args={[0.66, 0.62, 0.66]} />
        </mesh>
        <mesh position={[0, 2.26, 0]} material={m.red}>
          <boxGeometry args={[0.72, 0.22, 0.72]} />
        </mesh>
        <mesh position={[0.4, 2.15, 0]} material={m.darkRed}>
          <boxGeometry args={[0.3, 0.1, 0.66]} />
        </mesh>
      </group>
    </group>
  )
}
