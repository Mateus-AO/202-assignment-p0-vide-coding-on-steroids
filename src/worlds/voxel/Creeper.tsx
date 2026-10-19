import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial, type Group, type Mesh } from 'three'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { mulberry32 } from '@/utils/math/random'
import { paintNoise } from '@/utils/three/pixelArt'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import type { WorldProps } from '@/core/world'
import { beats } from './beats'
import { creeperPose, creeperVisible } from './creeper'

/** The warning flash is time-based and capped at this many pulses per second. */
const FLASHES_PER_SECOND = 2.5

const GREEN: [number, number, number] = [70, 168, 62]

/** Original design: a green speckled block creature with a wide grin. */
function createMaterials() {
  const skin = createPixelTexture(8, (ctx) => {
    paintNoise(ctx, 8, GREEN, 1, 60)
    // Darker blotches break up the speckle, like moss.
    const rng = mulberry32(4)
    ctx.fillStyle = 'rgba(20, 70, 25, 0.45)'
    for (let i = 0; i < 9; i++)
      ctx.fillRect(
        Math.floor(rng() * 7),
        Math.floor(rng() * 7),
        1 + Math.floor(rng() * 2),
        1,
      )
  })
  const face = createPixelTexture(8, (ctx) => {
    paintNoise(ctx, 8, GREEN, 2, 60)
    ctx.fillStyle = '#10200f'
    for (const [x, y, w, h] of [
      [1, 2, 2, 2],
      [5, 2, 2, 2],
      [1, 4, 1, 1],
      [6, 4, 1, 1],
      [2, 5, 4, 1],
    ]) {
      ctx.fillRect(x, y, w, h)
    }
  })
  const plain = new MeshBasicMaterial({ map: skin })
  const front = new MeshBasicMaterial({ map: face })
  const legs = new MeshBasicMaterial({ map: skin })
  const shadow = new MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  })
  return { plain, legs, shadow, head: [plain, plain, plain, plain, front, plain] }
}

const LEGS: [number, number][] = [
  [-0.25, 0.25],
  [0.25, 0.25],
  [-0.25, -0.25],
  [0.25, -0.25],
]

/** Wanders, turns to face the camera when it gets close, then ignites (swells and flashes). */
export function Creeper({ getU }: Pick<WorldProps, 'getU'>) {
  const group = useRef<Group>(null)
  const body = useRef<Group>(null)
  const legs = useRef<(Mesh | null)[]>([])
  const reduced = usePrefersReducedMotion()
  const { plain, legs: legMaterial, shadow, head } = useMemo(() => createMaterials(), [])

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const u = getU()
    g.visible = creeperVisible(u)
    if (!g.visible) return

    // Reduced motion freezes the idle wandering and the leg swing.
    const time = reduced ? 0 : clock.elapsedTime
    const pose = creeperPose(time, u)
    g.position.set(...pose.position)
    g.rotation.y = pose.yaw

    const hiss = reduced ? 0 : beats.smooth('hiss', u)
    g.scale.set(1 + 0.35 * hiss, 1 + 0.45 * hiss, 1 + 0.35 * hiss)
    const pulse =
      hiss > 0
        ? (Math.sin(clock.elapsedTime * Math.PI * 2 * FLASHES_PER_SECOND) + 1) / 2
        : 0
    plain.color.setScalar(1 + pulse * hiss * 4)
    head.forEach((m) => m.color.copy(plain.color))
    // Legs are a little darker than the body.
    legMaterial.color.copy(plain.color).multiplyScalar(0.82)

    // A small bob while strolling, and a nervous shake while igniting.
    if (body.current) {
      body.current.position.set(
        Math.sin(time * 47) * 0.035 * hiss,
        Math.abs(Math.sin(time * 6)) * 0.05 * pose.walking,
        Math.cos(time * 53) * 0.035 * hiss,
      )
    }

    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(time * 6 + i * Math.PI) * 0.5 * pose.walking
    })
  })

  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shadow}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>
      <group ref={body}>
        <mesh position={[0, 2.75, 0]} material={head}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh position={[0, 1.5, 0]} material={plain}>
          <boxGeometry args={[1, 1.5, 0.5]} />
        </mesh>
        {LEGS.map(([x, z], i) => (
          <mesh
            key={i}
            ref={(m) => {
              legs.current[i] = m
            }}
            position={[x, 0.375, z]}
            material={legMaterial}
          >
            <boxGeometry args={[0.5, 0.75, 0.5]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
