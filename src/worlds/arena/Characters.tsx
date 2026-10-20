import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial, type Group, type Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { lerp } from '@/utils/math'
import { newPose, poseAt, RALLY, type Pose } from './cast'
import { flatMaterial, shadedBox as box, shadedMaterial } from './shaded'

/**
 * The cast, redrawn from above in the arena's own code: the pong paddle and ball, the voxel
 * creature, the plumber-style hero and the patrolling walker. Their palettes are copied from
 * their worlds (worlds never import each other). Everything about where they stand and how they
 * move comes from `poseAt(id, u)`; here it is only applied to meshes.
 */

export function createCastMaterials() {
  return {
    // pong
    white: shadedMaterial('#ffffff', false),
    // hero
    blue: shadedMaterial('#2f4fd8'),
    red: shadedMaterial('#d8312f'),
    darkRed: shadedMaterial('#8f1f1f'),
    skin: shadedMaterial('#f1b98a'),
    hair: shadedMaterial('#4a2a12'),
    brown: shadedMaterial('#5a3418'),
    gloves: shadedMaterial('#f4f4f4'),
    gold: flatMaterial('#ffd23f'),
    ink: flatMaterial('#1a1a1a'),
    eyeWhite: flatMaterial('#ffffff'),
    nose: shadedMaterial('#e4936b'),
    // creature
    green: shadedMaterial('#46a83e'),
    greenLeg: shadedMaterial('#3a8a33'),
    moss: flatMaterial('#2f7a2c'),
    face: flatMaterial('#10200f'),
    // walker
    purple: shadedMaterial('#6a4fb0'),
    shell: shadedMaterial('#4a3585'),
    spike: shadedMaterial('#ffe14d'),
    boot: shadedMaterial('#1b1410'),
    yellow: flatMaterial('#ffd84d'),
    fang: flatMaterial('#f4f4f4'),
    // under every character
    shadow: new MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  }
}
export type CastMaterials = ReturnType<typeof createCastMaterials>

type Props = Pick<WorldProps, 'getU'> & {
  materials: CastMaterials
  /** Reduced motion: no hops, bobbing or stride; the poses are still where progress puts them. */
  calm: boolean
}

type Rig = { root: Group; lift: Group; shadow: Mesh | null }

/** Puts a character's root, lift and shadow where its pose says. */
function applyRoot({ root, lift, shadow }: Rig, p: Pose, calm: boolean) {
  root.visible = p.scale > 0.01
  root.position.set(p.x, 0, p.z)
  root.rotation.y = p.yaw
  root.scale.setScalar(p.scale)
  const y = calm ? 0 : p.y
  lift.position.y = y
  shadow?.scale.setScalar(1 / (1 + 0.8 * y))
}

/** The dark blob under a character. */
function Shadow({
  materials,
  size,
  forwardRef,
}: {
  materials: CastMaterials
  size: [number, number]
  forwardRef: React.Ref<Mesh>
}) {
  return (
    <group scale={[size[0], 1, size[1]]}>
      <mesh
        ref={forwardRef}
        position={[0, 0.02, 0]}
        rotation-x={-Math.PI / 2}
        material={materials.shadow}
      >
        <circleGeometry args={[0.5, 14]} />
      </mesh>
    </group>
  )
}

/** The white bar of the pong world, returning the ball. */
export function Paddle({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const pose = useRef(newPose())
  useFrame(() => {
    if (!root.current || !lift.current) return
    applyRoot(
      { root: root.current, lift: lift.current, shadow: null },
      poseAt('paddle', getU(), pose.current),
      calm,
    )
  })
  return (
    <group ref={root} visible={false}>
      <mesh
        position={[0.05, 0.02, 0]}
        rotation-x={-Math.PI / 2}
        scale={[0.9, RALLY.paddleLength + 0.3, 1]}
        material={m.shadow}
      >
        <circleGeometry args={[0.5, 14]} />
      </mesh>
      <group ref={lift}>
        <mesh
          position={[0, 0.25, 0]}
          material={m.white}
          geometry={box(RALLY.paddleThickness, 0.5, RALLY.paddleLength)}
          dispose={null}
        />
      </group>
    </group>
  )
}

/** The ball. */
export function Ball({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const pose = useRef(newPose())
  useFrame(() => {
    if (!root.current || !lift.current) return
    const u = getU()
    applyRoot(
      { root: root.current, lift: lift.current, shadow: shadow.current },
      poseAt('ball', u, pose.current),
      calm,
    )
    lift.current.rotation.y = calm ? 0 : u * 60
  })
  return (
    <group ref={root} visible={false}>
      <Shadow materials={m} size={[0.6, 0.6]} forwardRef={shadow} />
      <group ref={lift}>
        <mesh
          position={[0, RALLY.ballSize / 2, 0]}
          material={m.white}
          geometry={box(RALLY.ballSize, RALLY.ballSize, RALLY.ballSize)}
          dispose={null}
        />
      </group>
    </group>
  )
}

/** The plumber-style hero from the platformer, seen from above and ahead. */
export function Hero({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const arms = useRef<(Group | null)[]>([])
  const pose = useRef(newPose())

  useFrame(() => {
    if (!root.current || !lift.current) return
    const p = poseAt('hero', getU(), pose.current)
    applyRoot({ root: root.current, lift: lift.current, shadow: shadow.current }, p, calm)
    const walk = calm ? 0 : p.walk
    const air = calm ? 0 : p.air
    legs.current.forEach((leg, i) => {
      if (leg)
        leg.rotation.x = lerp(
          Math.sin(p.phase + i * Math.PI) * 0.85 * walk,
          i ? -0.6 : 0.6,
          air,
        )
    })
    arms.current.forEach((arm, i) => {
      if (arm)
        arm.rotation.x = lerp(
          Math.sin(p.phase + (i + 1) * Math.PI) * 0.8 * walk,
          -2.6,
          air,
        )
    })
    if (body.current) body.current.position.y = Math.abs(Math.sin(p.phase)) * 0.07 * walk
  })

  return (
    <group ref={root} visible={false}>
      <Shadow materials={m} size={[0.95, 0.95]} forwardRef={shadow} />
      <group ref={lift}>
        <group ref={body} scale={0.58}>
          {[-0.19, 0.19].map((x, i) => (
            <group
              key={x}
              ref={(g) => void (legs.current[i] = g)}
              position={[x, 0.72, 0]}
            >
              <mesh
                position={[0, -0.25, 0]}
                material={m.blue}
                geometry={box(0.34, 0.5, 0.34)}
                dispose={null}
              />
              <mesh
                position={[0, -0.58, 0.1]}
                material={m.brown}
                geometry={box(0.38, 0.22, 0.55)}
                dispose={null}
              />
            </group>
          ))}
          <mesh
            position={[0, 0.98, 0]}
            material={m.blue}
            geometry={box(0.72, 0.5, 0.7)}
            dispose={null}
          />
          <mesh
            position={[0, 1.38, 0]}
            material={m.red}
            geometry={box(0.7, 0.45, 0.68)}
            dispose={null}
          />
          {[-0.2, 0.2].map((x) => (
            <mesh
              key={x}
              position={[x, 1.3, 0.36]}
              material={m.gold}
              geometry={box(0.1, 0.1, 0.06)}
              dispose={null}
            />
          ))}
          {[-0.43, 0.43].map((x, i) => (
            <group
              key={x}
              ref={(g) => void (arms.current[i] = g)}
              position={[x, 1.55, 0]}
            >
              <mesh
                position={[0, -0.25, 0]}
                material={m.red}
                geometry={box(0.24, 0.5, 0.24)}
                dispose={null}
              />
              <mesh
                position={[0, -0.58, 0]}
                material={m.gloves}
                geometry={box(0.28, 0.2, 0.28)}
                dispose={null}
              />
            </group>
          ))}
          <group position={[0, 1.6, 0]}>
            <mesh
              position={[0, 0.28, 0]}
              material={m.skin}
              geometry={box(0.66, 0.62, 0.66)}
              dispose={null}
            />
            <mesh
              position={[0, 0.36, -0.37]}
              material={m.hair}
              geometry={box(0.7, 0.4, 0.12)}
              dispose={null}
            />
            {[-0.37, 0.37].map((x) => (
              <mesh
                key={x}
                position={[x, 0.3, 0]}
                material={m.skin}
                geometry={box(0.1, 0.2, 0.14)}
                dispose={null}
              />
            ))}
            {[-0.15, 0.15].map((x) => (
              <mesh
                key={x}
                position={[x, 0.4, 0.335]}
                material={m.eyeWhite}
                geometry={box(0.14, 0.14, 0.03)}
                dispose={null}
              />
            ))}
            {[-0.15, 0.15].map((x) => (
              <mesh
                key={x}
                position={[x, 0.4, 0.352]}
                material={m.ink}
                geometry={box(0.07, 0.12, 0.03)}
                dispose={null}
              />
            ))}
            <mesh
              position={[0, 0.27, 0.38]}
              material={m.nose}
              geometry={box(0.16, 0.14, 0.14)}
              dispose={null}
            />
            <mesh
              position={[0, 0.16, 0.345]}
              material={m.hair}
              geometry={box(0.42, 0.07, 0.06)}
              dispose={null}
            />
            <mesh
              position={[0, 0.66, 0]}
              material={m.red}
              geometry={box(0.72, 0.22, 0.72)}
              dispose={null}
            />
            <mesh
              position={[0, 0.55, 0.4]}
              material={m.darkRed}
              geometry={box(0.66, 0.1, 0.3)}
              dispose={null}
            />
          </group>
        </group>
      </group>
    </group>
  )
}

const CREATURE_LEGS: [number, number][] = [
  [-0.25, 0.25],
  [0.25, 0.25],
  [-0.25, -0.25],
  [0.25, -0.25],
]

/** The block creature from the voxel world: green, with a wide grin. */
export function Creature({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const legs = useRef<(Group | null)[]>([])
  const pose = useRef(newPose())

  useFrame(() => {
    if (!root.current || !lift.current) return
    const p = poseAt('creature', getU(), pose.current)
    applyRoot({ root: root.current, lift: lift.current, shadow: shadow.current }, p, calm)
    const walk = calm ? 0 : p.walk
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.x = Math.sin(p.phase + i * Math.PI) * 0.5 * walk
    })
    if (body.current) body.current.position.y = Math.abs(Math.sin(p.phase)) * 0.12 * walk
  })

  return (
    <group ref={root} visible={false}>
      <Shadow materials={m} size={[1.05, 1.05]} forwardRef={shadow} />
      <group ref={lift}>
        <group ref={body} scale={0.54}>
          <mesh
            position={[0, 2.75, 0]}
            material={m.green}
            geometry={box(1, 1, 1)}
            dispose={null}
          />
          {/* The grin: two eyes and a wide mouth on the front of the head. */}
          {(
            [
              [-0.25, 2.875, 0.25, 0.25],
              [0.25, 2.875, 0.25, 0.25],
              [-0.3125, 2.6875, 0.125, 0.125],
              [0.3125, 2.6875, 0.125, 0.125],
              [0, 2.5625, 0.5, 0.125],
            ] as const
          ).map(([x, y, w, h]) => (
            <mesh
              key={`${x},${y}`}
              position={[x, y, 0.505]}
              material={m.face}
              geometry={box(w, h, 0.02)}
              dispose={null}
            />
          ))}
          {/* Moss spots on top of the head. */}
          {(
            [
              [-0.25, -0.2],
              [0.2, 0.1],
              [-0.05, 0.3],
              [0.3, -0.3],
            ] as const
          ).map(([x, z]) => (
            <mesh
              key={`${x},${z}`}
              position={[x, 3.255, z]}
              material={m.moss}
              geometry={box(0.2, 0.02, 0.2)}
              dispose={null}
            />
          ))}
          <mesh
            position={[0, 1.5, 0]}
            material={m.green}
            geometry={box(1, 1.5, 0.5)}
            dispose={null}
          />
          {CREATURE_LEGS.map(([x, z], i) => (
            <group
              key={i}
              ref={(g) => void (legs.current[i] = g)}
              position={[x, 0.75, z]}
            >
              <mesh
                position={[0, -0.375, 0]}
                material={m.greenLeg}
                geometry={box(0.5, 0.75, 0.5)}
                dispose={null}
              />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

/** The low purple crawler with a spiky shell from the platformer. */
export function Walker({ getU, materials: m, calm }: Props) {
  const root = useRef<Group>(null)
  const lift = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const body = useRef<Group>(null)
  const feet = useRef<(Group | null)[]>([])
  const pose = useRef(newPose())

  useFrame(() => {
    if (!root.current || !lift.current) return
    const p = poseAt('walker', getU(), pose.current)
    applyRoot({ root: root.current, lift: lift.current, shadow: shadow.current }, p, calm)
    const walk = calm ? 0 : p.walk
    if (body.current) {
      // A little rock side to side and a bounce with each step.
      body.current.rotation.z = Math.sin(p.phase) * 0.06 * walk
      body.current.position.y = Math.abs(Math.sin(p.phase)) * 0.06 * walk
    }
    feet.current.forEach((f, i) => {
      if (f) f.position.y = Math.max(0, Math.sin(p.phase + i * Math.PI)) * 0.14 * walk
    })
  })

  return (
    <group ref={root} visible={false}>
      <Shadow materials={m} size={[1.25, 1.25]} forwardRef={shadow} />
      <group ref={lift}>
        <group ref={body} scale={0.78}>
          {[-0.38, 0.38].map((x, i) => (
            <group
              key={x}
              ref={(g) => void (feet.current[i] = g)}
              position={[x, 0, 0.05]}
            >
              <mesh
                position={[0, 0.12, 0]}
                material={m.boot}
                geometry={box(0.32, 0.24, 0.7)}
                dispose={null}
              />
            </group>
          ))}
          <mesh
            position={[0, 0.55, 0]}
            material={m.purple}
            geometry={box(1.1, 0.62, 1.0)}
            dispose={null}
          />
          <mesh
            position={[0, 1.0, -0.2]}
            material={m.shell}
            geometry={box(0.95, 0.34, 0.7)}
            dispose={null}
          />
          {[-0.32, 0, 0.32].map((x) => (
            <mesh
              key={x}
              position={[x, 1.3, -0.25]}
              material={m.spike}
              geometry={box(0.2, 0.28, 0.2)}
              dispose={null}
            />
          ))}
          {/* Angry yellow eyes, brows and little fangs on the front. */}
          {[-0.25, 0.25].map((x) => (
            <mesh
              key={x}
              position={[x, 0.62, 0.505]}
              material={m.yellow}
              geometry={box(0.2, 0.22, 0.03)}
              dispose={null}
            />
          ))}
          {[-0.25, 0.25].map((x) => (
            <mesh
              key={x}
              position={[x, 0.62, 0.52]}
              material={m.ink}
              geometry={box(0.08, 0.22, 0.03)}
              dispose={null}
            />
          ))}
          {([-1, 1] as const).map((side) => (
            <mesh
              key={side}
              position={[side * 0.25, 0.8, 0.505]}
              rotation-z={side * -0.35}
              material={m.ink}
              geometry={box(0.34, 0.07, 0.03)}
              dispose={null}
            />
          ))}
          <mesh
            position={[0, 0.36, 0.505]}
            material={m.ink}
            geometry={box(0.5, 0.08, 0.03)}
            dispose={null}
          />
          {[-0.18, 0.18].map((x) => (
            <mesh
              key={x}
              position={[x, 0.31, 0.52]}
              material={m.fang}
              geometry={box(0.07, 0.08, 0.03)}
              dispose={null}
            />
          ))}
        </group>
      </group>
    </group>
  )
}

/** The whole cast, one set of materials shared. */
export function Cast({ getU, calm }: Pick<Props, 'getU' | 'calm'>) {
  const materials = useMemo(() => createCastMaterials(), [])
  const props = { getU, materials, calm }
  return (
    <>
      <Paddle {...props} />
      <Ball {...props} />
      <Hero {...props} />
      <Creature {...props} />
      <Walker {...props} />
    </>
  )
}
