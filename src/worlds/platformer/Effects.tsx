import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, type InstancedMesh } from 'three'
import type { WorldProps } from '@/core/world'
import { EMITTERS, particleAt, SLOTS, type Particle } from './effects'
import { heroX } from './hero'
import { CONTACT_SHADOWS } from './scenery'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & { materials: PlatformerMaterials }

const dummy = new Object3D()
const particle: Particle = { x: 0, y: 0, z: 0, size: 0, spin: 0 }
const KIND_COLORS = ['#ffd23f', '#ffffff', '#d8c49a']

/** Soft dark patches on the ground under the pipes, the pole and the castle: one draw call. */
export function ContactShadows({ materials: m }: Pick<Props, 'materials'>) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const inst = mesh.current
    if (!inst) return
    CONTACT_SHADOWS.forEach(([x, z, w, d], i) => {
      dummy.position.set(x, 0.01, z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.set(w, d, 1)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    dummy.rotation.set(0, 0, 0)
    inst.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CONTACT_SHADOWS.length]}
      material={m.shadow}
      frustumCulled={false}
    >
      <planeGeometry />
    </instancedMesh>
  )
}

/**
 * Little cubes thrown up where the hero takes a coin, hits the block, takes off and lands. Every
 * particle is a function of his x (see `effects.ts`), so scrubbing back un-throws them. One
 * instanced mesh, matrices rewritten in place each frame.
 */
export function Sparkles({ getU, materials: m }: Props) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = mesh.current
    if (!inst) return
    const color = new Color()
    SLOTS.forEach(({ emitter }, i) =>
      inst.setColorAt(i, color.set(KIND_COLORS[emitter.kind])),
    )
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  }, [])

  useFrame(() => {
    const inst = mesh.current
    if (!inst) return
    const x = heroX(getU())
    for (let i = 0; i < SLOTS.length; i++) {
      if (particleAt(SLOTS[i], x, particle)) {
        dummy.position.set(particle.x, particle.y, particle.z)
        dummy.rotation.set(particle.spin, particle.spin * 0.7, 0)
        dummy.scale.setScalar(particle.size)
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    }
    dummy.rotation.set(0, 0, 0)
    inst.instanceMatrix.needsUpdate = true
  })

  if (EMITTERS.length === 0) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, SLOTS.length]}
      material={m.spark}
      frustumCulled={false}
    >
      <boxGeometry />
    </instancedMesh>
  )
}
