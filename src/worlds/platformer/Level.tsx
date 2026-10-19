import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { COIN_XS, FLAG_X, QUESTION_X } from './config'
import {
  blockBump,
  blockHit,
  coinCollect,
  coinPop,
  coinSpin,
  flagHeight,
  heroX,
  heroY,
} from './hero'
import { shadedBox as box } from './shaded'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & { materials: PlatformerMaterials; calm: boolean }

export function Pipe({ x, materials: m }: { x: number; materials: PlatformerMaterials }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.5, 0]} material={m.pipe}>
        <boxGeometry args={[2, 3, 2]} />
      </mesh>
      <mesh position={[0, 3.2, 0]} material={m.pipeRim}>
        <boxGeometry args={[2.4, 0.8, 2.4]} />
      </mesh>
    </group>
  )
}

/** A coin: a gold slab with a brighter face, spun by its parent group. */
function CoinShape({ materials: m }: { materials: PlatformerMaterials }) {
  return (
    <>
      <mesh material={m.coin}>
        <boxGeometry args={[0.5, 0.65, 0.1]} />
      </mesh>
      <mesh material={m.coinFace}>
        <boxGeometry args={[0.26, 0.42, 0.14]} />
      </mesh>
    </>
  )
}

/** Seen a little from the side even when it does not spin (reduced motion). */
const REST_SPIN = 0.5

/**
 * The question block, knocked up as the hero jumps under it; a coin pops out, and the block stays
 * plain once it has been hit. Everything follows his x.
 */
export function QuestionBlock({ getU, materials: m, calm }: Props) {
  const block = useRef<Mesh>(null)
  const coin = useRef<Group>(null)

  useFrame(() => {
    const x = heroX(getU())
    const b = block.current
    if (b) {
      const bump = blockBump(x)
      b.position.set(QUESTION_X, 4.5 + bump, 0)
      // A little squash as it is struck.
      const stretch = calm ? 1 : 1 - bump * 0.18
      b.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch))
      const material = blockHit(x) ? m.used : m.question
      if (b.material !== material) b.material = material
    }
    const pop = coinPop(x)
    if (coin.current) {
      coin.current.visible = pop !== null
      if (pop) {
        coin.current.position.set(QUESTION_X, 5.2 + pop.rise, 0)
        coin.current.rotation.y = calm ? REST_SPIN : pop.spin
      }
    }
  })

  return (
    <>
      <mesh ref={block} position={[QUESTION_X, 4.5, 0]} material={m.question}>
        <boxGeometry />
      </mesh>
      <group ref={coin} visible={false}>
        <CoinShape materials={m} />
      </group>
    </>
  )
}

/**
 * Coins along the first jump. They spin as the hero runs, bob a little, and fly up and shrink
 * away as he takes them. A coin is gone once he has reached it.
 */
export function Coins({ getU, materials: m, calm }: Props) {
  const coins = useRef<(Group | null)[]>([])

  useFrame(() => {
    const x = heroX(getU())
    COIN_XS.forEach((cx, i) => {
      const coin = coins.current[i]
      if (!coin) return
      const t = coinCollect(cx, x)
      coin.visible = t < 1
      if (t >= 1) return
      const bob = calm ? 0 : Math.sin(cx * 3 + x * 1.2) * 0.08
      coin.position.set(cx, heroY(cx) + 1.5 + bob + t * (2 - t) * 1.1, 0)
      coin.rotation.y = calm ? REST_SPIN : coinSpin(x, i)
      coin.scale.setScalar(1 - t * t)
    })
  })

  return COIN_XS.map((cx, i) => (
    <group key={cx} ref={(c) => void (coins.current[i] = c)}>
      <CoinShape materials={m} />
    </group>
  ))
}

const POLE_HEIGHT = 8
const FLAG_TOP = POLE_HEIGHT - 1
const FLAG_BOTTOM = 1.6

/** Goal pole; the flag slides down as the hero reaches it, and ripples a little. */
export function GoalFlag({ getU, materials: m, calm }: Props) {
  const flag = useRef<Group>(null)

  useFrame(() => {
    const x = heroX(getU())
    const f = flag.current
    if (!f) return
    f.position.set(FLAG_X - 0.08, flagHeight(x, FLAG_TOP, FLAG_BOTTOM), 0)
    f.rotation.y = calm ? 0 : Math.sin(x * 1.6) * 0.14
  })

  return (
    <>
      <mesh
        position={[FLAG_X, POLE_HEIGHT / 2, 0]}
        material={m.pole}
        geometry={box(0.16, POLE_HEIGHT, 0.16)}
        dispose={null}
      />
      <mesh
        position={[FLAG_X, POLE_HEIGHT + 0.25, 0]}
        material={m.gold}
        geometry={box(0.45, 0.45, 0.45)}
        dispose={null}
      />
      <group ref={flag}>
        <mesh position={[-0.7, 0, 0]} material={m.flag}>
          <boxGeometry args={[1.4, 0.9, 0.06]} />
        </mesh>
      </group>
    </>
  )
}
