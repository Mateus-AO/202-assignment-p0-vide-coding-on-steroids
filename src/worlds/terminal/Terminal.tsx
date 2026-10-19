import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DataTexture, NearestFilter, Object3D, RGBAFormat } from 'three'
import type { Group, InstancedMesh, ShaderMaterial } from 'three'
import type { WorldProps } from '@/core/world'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { usePointer } from '@/utils/hooks/usePointer'
import { mulberry32 } from '@/utils/math/random'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { beats } from './beats'
import { ATLAS_COLS, ATLAS_ROWS, GLYPH_H, GLYPH_W, createFontAtlas } from './font'
import { SCREEN_H, SCREEN_W } from './layout'
import { renderScreen, SCREEN_BYTES } from './screen'
import { COLS, ROWS } from './script'
import { screenFragment, screenVertex } from './shaders'
import { damp, tiltTarget } from './tilt'

const CYAN = '#59f3ff'
/** How quickly the screen follows the pointer, per second. */
const TILT_RATE = 7

function createScreen() {
  const data = new Uint8Array(SCREEN_BYTES)
  const texture = new DataTexture(data, COLS, ROWS, RGBAFormat)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { data, texture }
}

/** Corner brackets and a thin frame around the screen, at the given depth. */
function Frame({
  z,
  pad,
  thick,
  opacity,
}: {
  z: number
  pad: number
  thick: number
  opacity: number
}) {
  const w = SCREEN_W + pad * 2
  const h = SCREEN_H + pad * 2
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((sy) =>
        [-1, 1].map((sx) => (
          <group key={`${sx}${sy}`} position={[(sx * w) / 2, (sy * h) / 2, 0]}>
            <mesh position={[(-sx * 0.45) / 2, 0, 0]}>
              <boxGeometry args={[0.45, thick, thick]} />
              <meshBasicMaterial
                color={CYAN}
                transparent
                opacity={opacity}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, (-sy * 0.45) / 2, 0]}>
              <boxGeometry args={[thick, 0.45, thick]} />
              <meshBasicMaterial
                color={CYAN}
                transparent
                opacity={opacity}
                toneMapped={false}
              />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

/** Small glowing cubes floating around the screen at different depths, for parallax. */
function Motes({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const rng = mulberry32(11)
    const dummy = new Object3D()
    for (let i = 0; i < count; i++) {
      const side = rng() < 0.5 ? -1 : 1
      dummy.position.set(
        side * (SCREEN_W / 2 + 0.4 + rng() * 2.2),
        (rng() - 0.5) * (SCREEN_H + 1.5),
        -1.8 + rng() * 3.2,
      )
      dummy.scale.setScalar(0.05 + rng() * 0.11)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color={CYAN} transparent opacity={0.55} toneMapped={false} />
    </instancedMesh>
  )
}

/**
 * A holographic terminal floating in the dark. The text is one quad drawn by a shader from a
 * small grid of character cells, rewritten every frame from the world's progress. The panel
 * turns away from the pointer (or sways on its own on phones, and holds still with reduced
 * motion); that turn is a layer on top of the story, which does not depend on it.
 */
export function Terminal({ getU, quality }: WorldProps) {
  const reduced = usePrefersReducedMotion()
  const pointer = usePointer()
  useSceneAtmosphere({ background: '#000000' })

  const screen = useMemo(() => createScreen(), [])
  const font = useMemo(() => createFontAtlas(), [])
  useEffect(
    () => () => {
      screen.texture.dispose()
      font.dispose()
    },
    [screen, font],
  )

  const uniforms = useMemo(
    () => ({
      uScreen: { value: screen.texture },
      uFont: { value: font },
      uGrid: { value: [COLS, ROWS] },
      uFontGrid: { value: [ATLAS_COLS, ATLAS_ROWS] },
      uGlyph: { value: [GLYPH_W, GLYPH_H] },
      uTime: { value: 0 },
      uFade: { value: 0 },
      uBlink: { value: reduced ? 0 : 1 },
      uFancy: { value: quality === 'high' ? 1 : 0 },
    }),
    [screen, font, reduced, quality],
  )

  const panel = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const tilt = useRef({ pitch: 0, yaw: 0 })
  const target = useRef({ pitch: 0, yaw: 0 })

  /* eslint-disable react-hooks/immutability -- three.js textures and uniforms are mutable by design */
  useFrame(({ clock }, delta) => {
    const u = getU()
    renderScreen(u, screen.data)
    screen.texture.needsUpdate = true
    // Through the material, so the values land on the uniforms the renderer actually uploads.
    const live = material.current?.uniforms
    if (live) {
      live.uFade.value = beats.smooth('rise', u)
      live.uTime.value = reduced ? 0 : clock.elapsedTime
    }

    const want = tiltTarget(pointer.current, u, reduced, target.current)
    const dt = Math.min(delta, 0.1)
    tilt.current.pitch = damp(tilt.current.pitch, want.pitch, dt, TILT_RATE)
    tilt.current.yaw = damp(tilt.current.yaw, want.yaw, dt, TILT_RATE)
    panel.current?.rotation.set(tilt.current.pitch, tilt.current.yaw, 0)
  })
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={panel}>
      {/* Back glass and frame, behind the text. */}
      <mesh position={[0, 0, -0.35]}>
        <planeGeometry args={[SCREEN_W + 0.5, SCREEN_H + 0.5]} />
        <meshBasicMaterial
          color="#04252d"
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Frame z={-0.35} pad={0.25} thick={0.025} opacity={0.5} />

      <mesh renderOrder={1}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <shaderMaterial
          ref={material}
          vertexShader={screenVertex}
          fragmentShader={screenFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Bright corner brackets, in front of the text. */}
      <Frame z={0.45} pad={0.45} thick={0.04} opacity={0.9} />
      <Motes count={quality === 'high' ? 16 : 6} />
    </group>
  )
}
