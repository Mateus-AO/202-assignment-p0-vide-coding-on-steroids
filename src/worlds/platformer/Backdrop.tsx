import { useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { heroX } from './hero'
import { X_MAX, X_MIN } from './scenery'
import type { PlatformerMaterials } from './textures'

type GetU = Pick<WorldProps, 'getU'>

/**
 * A backdrop layer that follows the hero by `follow` of his travel, so it slides past slower
 * than the level: the farther the layer, the larger the fraction. Pure in progress, so it
 * scrubs, and a layer that stands still when he does.
 */
export function Layer({
  getU,
  follow,
  children,
}: GetU & { follow: number; children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    group.current?.position.set(follow * heroX(getU()), 0, 0)
  })
  return <group ref={group}>{children}</group>
}

/** The sky quad hangs this far in front of the camera, and is big enough for any screen. */
const SKY = { distance: 90, width: 260, height: 100 }

/**
 * The sky (a stepped gradient on one quad that always faces the camera, so its bands stay level
 * however the camera turns), a meadow behind the ground so the hills have a floor, and a block
 * of earth under the ground so the camera never sees past its edge.
 */
export function Backdrop({ materials: m }: { materials: PlatformerMaterials }) {
  const sky = useRef<Mesh>(null)
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const quad = sky.current
    if (!quad) return
    quad.quaternion.copy(camera.quaternion)
    quad.position
      .set(0, 0, -SKY.distance)
      .applyQuaternion(camera.quaternion)
      .add(camera.position)
  })
  const width = X_MAX - X_MIN + 2
  return (
    <>
      <mesh ref={sky} material={m.sky} renderOrder={-10}>
        <planeGeometry args={[SKY.width, SKY.height]} />
      </mesh>
      <mesh
        position={[(X_MIN + X_MAX) / 2, -0.02, -1.5 - 20]}
        rotation-x={-Math.PI / 2}
        material={m.field}
      >
        <planeGeometry args={[width + 60, 40]} />
      </mesh>
      <mesh position={[(X_MIN + X_MAX) / 2, -6 - 20, -0.01]} material={m.earth}>
        <boxGeometry args={[width, 40, 3]} />
      </mesh>
    </>
  )
}
