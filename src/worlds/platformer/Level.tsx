import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { WorldProps } from '@/core/world'
import { CASTLE_X, COIN_XS, FLAG_X, QUESTION_X } from './config'
import { blockBump, coinPop, coinTaken, flagHeight, heroX, heroY } from './hero'
import type { PlatformerMaterials } from './textures'

type Props = Pick<WorldProps, 'getU'> & { materials: PlatformerMaterials }

export function Pipe({ x, materials: m }: { x: number; materials: PlatformerMaterials }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.5, 0]} material={m.pipe}>
        <boxGeometry args={[2, 3, 2]} />
      </mesh>
      <mesh position={[0, 3.2, 0]} material={m.pipe}>
        <boxGeometry args={[2.4, 0.8, 2.4]} />
      </mesh>
    </group>
  )
}

/** The question block, knocked up as the hero jumps under it; a coin pops out. */
export function QuestionBlock({ getU, materials: m }: Props) {
  const block = useRef<Mesh>(null)
  const coin = useRef<Mesh>(null)

  useFrame(() => {
    const x = heroX(getU())
    block.current?.position.set(QUESTION_X, 4.5 + blockBump(x), 0)
    const pop = coinPop(x)
    if (coin.current) {
      coin.current.visible = pop !== null
      if (pop) {
        coin.current.position.set(QUESTION_X, 5.2 + pop.rise, 0)
        coin.current.rotation.y = pop.spin
      }
    }
  })

  return (
    <>
      <mesh ref={block} position={[QUESTION_X, 4.5, 0]} material={m.question}>
        <boxGeometry />
      </mesh>
      <mesh ref={coin} visible={false} material={m.gold}>
        <boxGeometry args={[0.5, 0.65, 0.1]} />
      </mesh>
    </>
  )
}

/** Spinning coins along the first jump; each is gone once the hero reaches it. */
export function Coins({ getU, materials: m }: Props) {
  const coins = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const x = heroX(getU())
    COIN_XS.forEach((cx, i) => {
      const coin = coins.current[i]
      if (!coin) return
      coin.visible = !coinTaken(cx, x)
      coin.position.set(cx, heroY(cx) + 1.5, 0)
      coin.rotation.y = clock.elapsedTime * 3 + i
    })
  })

  return COIN_XS.map((cx, i) => (
    <mesh key={cx} ref={(c) => void (coins.current[i] = c)} material={m.gold}>
      <boxGeometry args={[0.5, 0.65, 0.1]} />
    </mesh>
  ))
}

const POLE_HEIGHT = 8
const FLAG_TOP = POLE_HEIGHT - 1
const FLAG_BOTTOM = 1.6

/** Goal pole; the flag slides down as the hero reaches it. */
export function GoalFlag({ getU, materials: m }: Props) {
  const flag = useRef<Group>(null)

  useFrame(() => {
    flag.current?.position.set(
      FLAG_X - 0.75,
      flagHeight(heroX(getU()), FLAG_TOP, FLAG_BOTTOM),
      0,
    )
  })

  return (
    <>
      <mesh position={[FLAG_X, POLE_HEIGHT / 2, 0]} material={m.pole}>
        <boxGeometry args={[0.16, POLE_HEIGHT, 0.16]} />
      </mesh>
      <mesh position={[FLAG_X, POLE_HEIGHT + 0.25, 0]} material={m.gold}>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
      </mesh>
      <group ref={flag}>
        <mesh material={m.flag}>
          <boxGeometry args={[1.4, 0.9, 0.06]} />
        </mesh>
      </group>
    </>
  )
}

/** Door and windows for the castle (its bricks are instanced in scenery.ts). */
export function CastleDetails({ materials: m }: { materials: PlatformerMaterials }) {
  return (
    <>
      <mesh position={[CASTLE_X, 1.1, 0.52]} material={m.dark}>
        <boxGeometry args={[1.4, 2.2, 0.08]} />
      </mesh>
      <mesh position={[CASTLE_X, 2.25, 0.52]} material={m.dark}>
        <boxGeometry args={[1, 0.5, 0.08]} />
      </mesh>
      <mesh position={[CASTLE_X, 5.5, 0.02]} material={m.dark}>
        <boxGeometry args={[0.6, 0.9, 0.08]} />
      </mesh>
    </>
  )
}
