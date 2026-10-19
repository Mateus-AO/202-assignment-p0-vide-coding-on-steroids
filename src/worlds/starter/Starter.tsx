import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { NoToneMapping, type ShaderMaterial } from 'three'
import { markReady, useReadiness } from '@/core/readiness'
import type { WorldProps } from '@/core/world'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { clamp, lerp } from '@/utils/math'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { beats } from './beats'
import { GLASS_H, GLASS_W, GLASS_Z, HOLE_H, HOLE_W, PLATE_Z, glassRect } from './camera'
import { createPlateGeometry } from './casing'
import { bootLog } from './captions'
import { LOGICAL_H, LOGICAL_W } from './layout'
import {
  bootedViewInto,
  bootViewInto,
  createBootView,
  MIN_BOOT_SECONDS,
  type TaskId,
} from './loading'
import { createScreenCanvas, drawScreen } from './screenCanvas'
import { glassFragment, plateFragment, vertex } from './shaders'
import { useStarterStore } from './store'

const FONT_FACE = '"Press Start 2P"'
/** Screen pixels per scanline the glass aims for (the line count follows the glass's size). */
const PX_PER_SCANLINE = 3.4

const done = (id: TaskId) => markReady(id)

/** Dev only: `?boot=6` stretches the minimum boot time so the loading state can be inspected. */
const bootSeconds = () => {
  if (!import.meta.env.DEV) return MIN_BOOT_SECONDS
  const v = Number(new URLSearchParams(location.search).get('boot'))
  return Number.isFinite(v) && v > 0 ? v : MIN_BOOT_SECONDS
}

/**
 * A CRT screen filling the view, behind a casing plate with a window in it. The glass draws a
 * canvas (boot log and loading bar) through its own fisheye shader. While the screen waits, its
 * state comes from the clock and the real startup work; once booted, everything is a function
 * of the world's progress `u`. The camera flies into the glass, the picture drops to static and
 * black, and the portal into the next world opens in its place.
 */
export function Starter({ getU, quality }: WorldProps) {
  const reduced = usePrefersReducedMotion()
  useSceneAtmosphere({ background: '#030405' })
  const scale = quality === 'high' ? 2 : 1

  const screen = useMemo(() => createScreenCanvas(scale), [scale])
  const plate = useMemo(() => createPlateGeometry(), [])
  useEffect(() => () => screen.texture.dispose(), [screen])
  useEffect(() => () => plate.dispose(), [plate])

  const size = useThree((s) => s.size)
  const aspect = size.width / size.height
  const lines = clamp(
    Math.round((size.height * glassRect(aspect).height) / PX_PER_SCANLINE),
    60,
    220,
  )

  // Pong, the next world, draws its whites with `toneMapped={false}`. Through a portal drei
  // tone-maps the whole picture, so they would show grey until the swap. With tone mapping off
  // while this world is up, the portal and the root agree. This world's colors are chosen
  // for that, so it never reads the renderer's default.
  const gl = useThree((s) => s.gl)
  /* eslint-disable react-hooks/immutability -- the renderer is a mutable three.js object */
  useEffect(() => {
    const previous = gl.toneMapping
    gl.toneMapping = NoToneMapping
    return () => {
      gl.toneMapping = previous
    }
  }, [gl])
  /* eslint-enable react-hooks/immutability */

  // Real startup work. The bar follows these; Play waits for them.
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const settle = () => done('fonts')
    Promise.all([
      document.fonts.load(`16px ${FONT_FACE}`, 'AaZz09>%.'),
      document.fonts.ready,
    ]).then(settle, settle)
  }, [])
  useEffect(() => {
    const settle = () => done('shaders')
    gl.compileAsync(scene, camera).then(settle, settle)
  }, [gl, scene, camera])

  const uniforms = useMemo(
    () => ({
      glass: {
        uTex: { value: screen.texture },
        uTexel: { value: [1 / (LOGICAL_W * scale), 1 / (LOGICAL_H * scale)] },
        uTime: { value: 0 },
        uCurve: { value: 0.06 },
        uFade: { value: 1 },
        uNoise: { value: 0 },
        uFlicker: { value: reduced ? 0 : 1 },
        uFancy: { value: quality === 'high' ? 1 : 0 },
        uLines: { value: 120 },
      },
      plate: {
        uHole: { value: [HOLE_W, HOLE_H] },
        uPower: { value: 1 },
      },
    }),
    [screen, scale, reduced, quality],
  )

  const glass = useRef<ShaderMaterial>(null)
  const run = useRef({ t0: -1, key: -1, view: createBootView() })

  useFrame(({ clock }) => {
    const u = getU()
    const r = run.current
    const store = useStarterStore.getState()
    const now = clock.elapsedTime
    if (r.t0 < 0) r.t0 = now

    // The loading screen: from the clock and real readiness until it has finished once.
    const ready = useReadiness.getState().ready
    if (store.booted) bootedViewInto(r.view, bootLog)
    else {
      bootViewInto(r.view, bootLog, ready, now - r.t0, {
        minSeconds: bootSeconds(),
        lineWise: reduced,
      })
      if (r.view.ready) store.setBooted()
    }
    // Only READY blinks (1 Hz); a reduced-motion visitor gets it steady.
    const blinkOn = reduced || !r.view.ready || (Math.floor(now * 2) & 1) === 0
    const key =
      ((r.view.typed * 64 + r.view.cells) * 256 + r.view.okMask) * 8 +
      (ready.fonts ? 1 : 0) +
      (blinkOn ? 2 : 0) +
      (r.view.ready ? 4 : 0)
    if (key !== r.key) {
      r.key = key
      drawScreen(screen, scale, r.view, { blinkOn })
    }

    // The glass, as a function of progress.
    const live = glass.current?.uniforms
    if (live) {
      const tune = beats.linear('tune', u)
      live.uTime.value = reduced ? 0 : now
      live.uCurve.value = lerp(0.06, 0.16, beats.smooth('flight', u))
      live.uFade.value = 1 - beats.smooth('tune', u)
      live.uNoise.value = reduced ? 0 : 0.4 * Math.sin(Math.PI * tune)
      live.uLines.value = lines
    }
  })

  return (
    <group>
      <mesh geometry={plate} position={[0, 0, PLATE_Z]}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={plateFragment}
          uniforms={uniforms.plate}
        />
      </mesh>
      <mesh position={[0, 0, GLASS_Z]}>
        <planeGeometry args={[GLASS_W, GLASS_H]} />
        <shaderMaterial
          ref={glass}
          vertexShader={vertex}
          fragmentShader={glassFragment}
          uniforms={uniforms.glass}
        />
      </mesh>
    </group>
  )
}
