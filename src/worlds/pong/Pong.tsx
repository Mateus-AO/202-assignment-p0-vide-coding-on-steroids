import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, type Group, type InstancedMesh, type Mesh } from 'three'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { createPixelTexture } from '@/utils/three/pixelTexture'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { VoxelDebris } from '@/utils/transitions/VoxelDebris'
import type { WorldProps } from '@/core/world'
import { beats } from './beats'
import {
  BALL_SIZE,
  BLOCK_POS,
  BLOCK_SIZE,
  HALF_H,
  HALF_W,
  PADDLE_DEPTH,
  PADDLE_X,
  WALL_THICKNESS,
} from './court'
import { DIGIT_CELLS, DIGIT_COLS, DIGIT_ROWS, digitCell } from './digits'
import {
  ballAtInto,
  hitPulse,
  hitsPassed,
  paddleY,
  scoreAtInto,
  type HitKind,
} from './rally'
import { WhiteCrack } from './WhiteCrack'

/** Matrices are rebuilt in place every frame: nothing below allocates inside useFrame. */
const dummy = new Object3D()
const ball = { x: 0, y: 0 }
const behind = { x: 0, y: 0 }
const score = { l: 0, r: 0 }

const TRAIL = 7
const TRAIL_STEP = 0.0022
/** Instances of the moving pieces: ball, left paddle, right paddle, then the trail. */
const MOVERS = 3 + TRAIL

const ANY_HIT: readonly HitKind[] = ['paddleL', 'paddleR', 'block']
const WALL_HIT: readonly HitKind[] = ['wall']
const SQUASH_WIDTH = 0.01
/** The shake lasts this long in real time after an impact, however the page is scrolled. */
const SHAKE_SECONDS = 0.25
const SHAKE_AMPLITUDE = 0.05

const DIGIT_CELL = 0.22
const DIGIT_Y = 2.75
const DIGIT_XS = [-1.9, 1.9]
const DIGIT_GREY = '#4a4a4a'

const DASHES = Array.from({ length: 9 }, (_, i) => -3.6 + i * 0.9)

/** Box instance with position `p` and size `s`, written to slot `i`. */
function place(
  mesh: InstancedMesh,
  i: number,
  px: number,
  py: number,
  sx: number,
  sy: number,
  sz: number,
) {
  dummy.position.set(px, py, 0)
  dummy.scale.set(sx, sy, sz)
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}

export function Pong({ getU }: WorldProps) {
  useSceneAtmosphere({ background: '#000000' })
  const reduced = usePrefersReducedMotion()

  const court = useRef<Group>(null)
  const fixed = useRef<InstancedMesh>(null)
  const movers = useRef<InstancedMesh>(null)
  const digits = useRef<InstancedMesh>(null)
  const block = useRef<Mesh>(null)
  const shown = useRef({ l: -1, r: -1 })
  // Impacts seen so far (null until the first frame) and when the last new one landed.
  const shake = useRef<{ seen: number | null; at: number }>({ seen: null, at: -Infinity })

  // Black block with a white frame and a faint dithered inner border, so it reads on black.
  const blockTexture = useMemo(
    () =>
      createPixelTexture(8, (ctx) => {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, 8, 8)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 8, 1)
        ctx.fillRect(0, 7, 8, 1)
        ctx.fillRect(0, 0, 1, 8)
        ctx.fillRect(7, 0, 1, 8)
        ctx.fillStyle = '#2b2b2b'
        for (let i = 1; i < 7; i++) {
          if (i % 2 === 1) {
            ctx.fillRect(i, 1, 1, 1)
            ctx.fillRect(i, 6, 1, 1)
          } else {
            ctx.fillRect(1, i, 1, 1)
            ctx.fillRect(6, i, 1, 1)
          }
        }
      }),
    [],
  )

  // Static court: two walls and the dashed net, one draw call.
  useLayoutEffect(() => {
    const m = fixed.current
    if (!m) return
    place(m, 0, 0, HALF_H, HALF_W * 2 + 1, WALL_THICKNESS, 0.2)
    place(m, 1, 0, -HALF_H, HALF_W * 2 + 1, WALL_THICKNESS, 0.2)
    DASHES.forEach((y, i) => place(m, 2 + i, 0, y, 0.18, 0.45, 0.2))
    m.instanceMatrix.needsUpdate = true
  }, [])

  // The trail fades by instance color: set once.
  useLayoutEffect(() => {
    const m = movers.current
    if (!m) return
    const c = new Color()
    for (let i = 0; i < MOVERS; i++) {
      const v = i < 3 ? 1 : 0.55 * (1 - (i - 3) / TRAIL)
      m.setColorAt(i, c.setRGB(v, v, v))
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    const u = getU()
    const m = movers.current
    if (!m) return

    // Whole-court shake when the ball crosses a paddle or block impact, then a timed decay.
    // Driven by real time, so a scroll position resting next to an impact stays still, and the
    // first frame only records the starting count (no shake on load or when jumping around).
    if (court.current) {
      const hits = hitsPassed(u, ANY_HIT)
      const sh = shake.current
      if (sh.seen !== null && hits > sh.seen) sh.at = clock.elapsedTime
      sh.seen = hits
      const left = 1 - (clock.elapsedTime - sh.at) / SHAKE_SECONDS
      const s = reduced ? 0 : Math.max(0, left) * SHAKE_AMPLITUDE
      court.current.position.set(
        Math.sin(clock.elapsedTime * 90) * s,
        Math.cos(clock.elapsedTime * 110) * s,
        0,
      )
    }

    // Ball, squashed against whatever it hits.
    ballAtInto(u, ball)
    const side = hitPulse(u, ANY_HIT, SQUASH_WIDTH)
    const wall = hitPulse(u, WALL_HIT, SQUASH_WIDTH)
    const sx = BALL_SIZE * (1 - 0.4 * side + 0.3 * wall)
    const sy = BALL_SIZE * (1 + 0.3 * side - 0.4 * wall)
    place(m, 0, ball.x, ball.y, sx, sy, BALL_SIZE)

    place(m, 1, -PADDLE_X, paddleY('paddleL', u), PADDLE_DEPTH, 1.6, PADDLE_DEPTH)
    place(m, 2, PADDLE_X, paddleY('paddleR', u), PADDLE_DEPTH, 1.6, PADDLE_DEPTH)

    for (let k = 0; k < TRAIL; k++) {
      ballAtInto(u - (k + 1) * TRAIL_STEP, behind)
      const size = BALL_SIZE * (0.7 - 0.08 * k)
      place(m, 3 + k, behind.x, behind.y, size, size, size)
    }
    m.instanceMatrix.needsUpdate = true

    // Scoreboard: rebuilt only when a digit changes.
    const d = digits.current
    scoreAtInto(u, score)
    if (d && (score.l !== shown.current.l || score.r !== shown.current.r)) {
      shown.current.l = score.l
      shown.current.r = score.r
      for (let n = 0; n < 2; n++) {
        const value = n === 0 ? score.l : score.r
        for (let i = 0; i < DIGIT_CELLS; i++) {
          const col = i % DIGIT_COLS
          const row = Math.floor(i / DIGIT_COLS)
          const on = digitCell(value, i) ? DIGIT_CELL : 0
          place(
            d,
            n * DIGIT_CELLS + i,
            DIGIT_XS[n] + (col - 1) * DIGIT_CELL,
            DIGIT_Y + (DIGIT_ROWS / 2 - row - 0.5) * DIGIT_CELL,
            on,
            on,
            on,
          )
        }
      }
      d.instanceMatrix.needsUpdate = true
    }

    if (block.current) block.current.visible = !beats.started('shatter', u)
  })

  const crack = () => beats.smooth('crack', getU())
  const debris = () => beats.smooth('shatter', getU())

  return (
    <group ref={court}>
      <instancedMesh
        ref={fixed}
        args={[undefined, undefined, 2 + DASHES.length]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshBasicMaterial color="white" toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={digits}
        args={[undefined, undefined, 2 * DIGIT_CELLS]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshBasicMaterial color={DIGIT_GREY} toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={movers}
        args={[undefined, undefined, MOVERS]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshBasicMaterial color="white" toneMapped={false} />
      </instancedMesh>

      <mesh ref={block} position={BLOCK_POS}>
        <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
        <meshBasicMaterial map={blockTexture} toneMapped={false} />
      </mesh>
      <WhiteCrack position={BLOCK_POS} size={BLOCK_SIZE} getProgress={crack} />
      <VoxelDebris
        position={BLOCK_POS}
        spread={BLOCK_SIZE}
        size={0.35}
        color="#ffffff"
        count={44}
        seed={11}
        getProgress={debris}
      />
      <VoxelDebris
        position={BLOCK_POS}
        spread={BLOCK_SIZE}
        size={0.28}
        color="#8a8a8a"
        count={28}
        seed={5}
        getProgress={debris}
      />
    </group>
  )
}
