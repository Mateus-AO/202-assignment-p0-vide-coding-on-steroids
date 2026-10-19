import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  DataTexture,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
} from 'three'
import type { Group, InstancedMesh, ShaderMaterial } from 'three'
import type { WorldProps } from '@/core/world'
import { usePointer } from '@/utils/hooks/usePointer'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { damp } from '@/utils/math'
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  GLYPH_H,
  GLYPH_W,
  createFontAtlas,
} from '@/utils/three/pixelFont'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { beats } from './beats'
import { blinkAt, lookTarget } from './blink'
import type { Look } from './blink'
import { fillGlassState, STATE_STRIDE } from './glassState'
import {
  PIC_H,
  PIC_W,
  PILE_CENTER,
  POSES,
  SCREEN_H,
  SCREEN_W,
  SLOTS,
  TV_COUNT,
  tiltAt,
} from './layout'
import { GLASS_BULGE, GLASS_Z, createTvBody } from './model'
import { PALETTE, renderPicture } from './picture'
import { pileTiltTarget } from './pileTilt'
import type { PileTilt } from './pileTilt'
import {
  bodyFragment,
  bodyVertex,
  glassFragment,
  glassVertex,
  haloFragment,
  haloVertex,
} from './shaders'
import { COLS_TV, ROWS_TV, TV_BYTES, phosphorOf, tvScreen } from './script'

/** How quickly the pile and the pupils follow the pointer, per second. */
const TILT_RATE = 6
const LOOK_RATE = 9
/** The picture is only re-drawn when the pupils moved this much or the lids a quarter step. */
const LOOK_EPSILON = 0.015
const BLINK_STEPS = 4
/** The halo plane sits in front of the glass and its bulge. */
const HALO_Z = 0.14
const HALO_W = SCREEN_W + 1.5
const HALO_H = SCREEN_H + 1.3

/** The set's cabinet tints (sRGB): beige, grey, cream, charcoal, wood, and so on. */
const TINTS: readonly (readonly [number, number, number])[] = [
  [0.8, 0.74, 0.6],
  [0.52, 0.54, 0.55],
  [0.88, 0.83, 0.7],
  [0.32, 0.33, 0.35],
  [0.5, 0.33, 0.2],
  [0.72, 0.7, 0.62],
  [0.42, 0.45, 0.42],
  [0.84, 0.78, 0.64],
  [0.6, 0.5, 0.4],
]

function createScreens() {
  const data = new Uint8Array(TV_BYTES * TV_COUNT)
  // One view per set, made once, so nothing is allocated per frame.
  const views = Array.from({ length: TV_COUNT }, (_, i) =>
    data.subarray(i * TV_BYTES, (i + 1) * TV_BYTES),
  )
  const texture = new DataTexture(data, COLS_TV, ROWS_TV * TV_COUNT, RGBAFormat)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { data, views, texture }
}

function createPicture() {
  const indices = new Uint8Array(PIC_W * PIC_H)
  const rgba = new Uint8Array(PIC_W * PIC_H * 4)
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255
  const palette = new Uint8Array(256 * 3)
  PALETTE.forEach((c, i) => palette.set(c, i * 3))
  const texture = new DataTexture(rgba, PIC_W, PIC_H, RGBAFormat)
  texture.magFilter = texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return { indices, rgba, palette, texture }
}

/** Per-set data the glass and halo share: slices, phosphors, state. */
function createSetAttributes() {
  const rect = new Float32Array(TV_COUNT * 4)
  const phos = new Float32Array(TV_COUNT * 3)
  const tint = new Float32Array(TV_COUNT * 3)
  SLOTS.forEach((slot, i) => {
    rect.set([slot.rect.x0, slot.rect.y0, slot.rect.x1, slot.rect.y1], i * 4)
    phos.set(phosphorOf(i), i * 3)
    tint.set(TINTS[i % TINTS.length], i * 3)
  })
  const state = new InstancedBufferAttribute(new Float32Array(TV_COUNT * STATE_STRIDE), 4)
  state.setUsage(DynamicDrawUsage)
  const glow = new InstancedBufferAttribute(new Float32Array(TV_COUNT), 1)
  glow.setUsage(DynamicDrawUsage)
  return {
    rect: new InstancedBufferAttribute(rect, 4),
    phos: new InstancedBufferAttribute(phos, 3),
    tint: new InstancedBufferAttribute(tint, 3),
    state,
    glow,
  }
}

/**
 * A pile of nine old TV sets, four, three and two high. Each set is a boxy tube TV with a
 * convex glass that shows its own decompile session in its own phosphor; as the story ends
 * every screen scrambles and locks into its own slice of one picture. Two instanced meshes
 * (bodies, glass) and one halo draw the whole pile, and everything on screen is a pure
 * function of the world's progress, except the pointer layer (the pile's small turn and the
 * mascot's eyes, which follow the mouse and blink on the clock).
 */
export function Wall({ getU, quality }: WorldProps) {
  const reduced = usePrefersReducedMotion()
  const pointer = usePointer()
  const high = quality === 'high'
  useSceneAtmosphere({ background: '#000000' })

  const screens = useMemo(() => createScreens(), [])
  const picture = useMemo(() => createPicture(), [])
  const font = useMemo(() => createFontAtlas(), [])
  const sets = useMemo(() => createSetAttributes(), [])

  const bodyGeometry = useMemo(() => {
    const g = createTvBody()
    g.setAttribute('aTint', sets.tint)
    g.setAttribute('aGlow', sets.glow)
    return g
  }, [sets])

  const glassGeometry = useMemo(() => {
    const g = high
      ? new PlaneGeometry(SCREEN_W, SCREEN_H, 24, 18)
      : new PlaneGeometry(SCREEN_W, SCREEN_H, 2, 2)
    g.setAttribute('aRect', sets.rect)
    g.setAttribute('aPhos', sets.phos)
    g.setAttribute('aState', sets.state)
    g.setAttribute('aGlow', sets.glow)
    return g
  }, [sets, high])

  const haloGeometry = useMemo(() => {
    const g = new PlaneGeometry(HALO_W, HALO_H)
    g.translate(0, 0, HALO_Z)
    g.setAttribute('aPhos', sets.phos)
    g.setAttribute('aState', sets.state)
    return g
  }, [sets])

  useEffect(
    () => () => {
      screens.texture.dispose()
      picture.texture.dispose()
      font.dispose()
      bodyGeometry.dispose()
      glassGeometry.dispose()
      haloGeometry.dispose()
    },
    [screens, picture, font, bodyGeometry, glassGeometry, haloGeometry],
  )

  const glassUniforms = useMemo(
    () => ({
      uScreen: { value: screens.texture },
      uFont: { value: font },
      uPicture: { value: picture.texture },
      uGrid: { value: [COLS_TV, ROWS_TV] },
      uFontGrid: { value: [ATLAS_COLS, ATLAS_ROWS] },
      uGlyph: { value: [GLYPH_W, GLYPH_H] },
      uPic: { value: [PIC_W, PIC_H] },
      uTvCount: { value: TV_COUNT },
      uTime: { value: 0 },
      uMotion: { value: reduced ? 0 : 1 },
      uFancy: { value: high ? 1 : 0 },
      uBulge: { value: high ? GLASS_BULGE : 0 },
      uZ: { value: GLASS_Z },
    }),
    [screens, picture, font, reduced, high],
  )

  const haloUniforms = useMemo(
    () => ({
      uHalf: { value: [HALO_W / 2, HALO_H / 2] },
      uGlass: { value: [SCREEN_W, SCREEN_H] },
    }),
    [],
  )

  const pile = useRef<Group>(null)
  const bodies = useRef<InstancedMesh>(null)
  const glasses = useRef<InstancedMesh>(null)
  const halos = useRef<InstancedMesh>(null)
  const glassMaterial = useRef<ShaderMaterial>(null)

  const run = useRef({
    lastU: -1,
    tilt: { pitch: 0, yaw: 0 } as PileTilt,
    tiltTarget: { pitch: 0, yaw: 0 } as PileTilt,
    pose: { yaw: 0, roll: 0 },
    look: { x: 0, y: 0 } as Look,
    lookTarget: { x: 0, y: 0 } as Look,
    drawn: { x: 9, y: 9, blink: -1 },
    dummy: new Object3D(),
  })

  /* eslint-disable react-hooks/immutability -- three.js objects are mutable by design */
  useFrame(({ clock }, delta) => {
    const u = getU()
    const t = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const r = run.current

    // Everything that depends on progress alone, only when progress moved.
    if (u !== r.lastU) {
      r.lastU = u
      if (u >= beats.ranges.hold[0]) {
        for (let i = 0; i < TV_COUNT; i++) tvScreen(i, u, screens.views[i])
        screens.texture.needsUpdate = true
      }
      fillGlassState(
        u,
        reduced,
        sets.state.array as Float32Array,
        sets.glow.array as Float32Array,
      )
      sets.state.needsUpdate = true
      sets.glow.needsUpdate = true

      const body = bodies.current
      const glass = glasses.current
      const halo = halos.current
      if (body && glass) {
        const { dummy, pose } = r
        for (let i = 0; i < TV_COUNT; i++) {
          const p = POSES[i]
          tiltAt(i, u, pose)
          dummy.position.set(SLOTS[i].x + p.dx, SLOTS[i].y + p.dy - PILE_CENTER.y, p.dz)
          dummy.rotation.set(0, pose.yaw, pose.roll, 'YXZ')
          dummy.scale.setScalar(p.scale)
          dummy.updateMatrix()
          body.setMatrixAt(i, dummy.matrix)
          glass.setMatrixAt(i, dummy.matrix)
          halo?.setMatrixAt(i, dummy.matrix)
        }
        body.instanceMatrix.needsUpdate = true
        glass.instanceMatrix.needsUpdate = true
        if (halo) halo.instanceMatrix.needsUpdate = true
      }
    }

    // The pointer layer: the pile's small turn.
    pileTiltTarget(pointer.current, u, reduced, r.tiltTarget)
    r.tilt.pitch = damp(r.tilt.pitch, r.tiltTarget.pitch, dt, TILT_RATE)
    r.tilt.yaw = damp(r.tilt.yaw, r.tiltTarget.yaw, dt, TILT_RATE)
    pile.current?.rotation.set(r.tilt.pitch, r.tilt.yaw, 0)

    // The mascot: pupils follow the pointer, the lids blink on the clock.
    if (u >= beats.ranges.assemble[0]) {
      lookTarget(pointer.current, t, reduced, r.lookTarget)
      r.look.x = damp(r.look.x, r.lookTarget.x, dt, LOOK_RATE)
      r.look.y = damp(r.look.y, r.lookTarget.y, dt, LOOK_RATE)
      const [from, to] = beats.ranges.assemble
      const blink = reduced || u < (from + to) / 2 ? 0 : blinkAt(t)
      const step = Math.round(blink * BLINK_STEPS) / BLINK_STEPS
      const d = r.drawn
      if (
        step !== d.blink ||
        Math.abs(r.look.x - d.x) > LOOK_EPSILON ||
        Math.abs(r.look.y - d.y) > LOOK_EPSILON
      ) {
        d.x = r.look.x
        d.y = r.look.y
        d.blink = step
        drawPicture(picture, r.look, step)
      }
    }

    // Through the material, so the values land on the uniforms the renderer uploads.
    const live = glassMaterial.current?.uniforms
    if (live) live.uTime.value = reduced ? 0 : t
  })
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={pile} position={[0, PILE_CENTER.y, 0]}>
      <instancedMesh
        ref={bodies}
        args={[bodyGeometry, undefined, TV_COUNT]}
        frustumCulled={false}
      >
        <shaderMaterial
          vertexShader={bodyVertex}
          fragmentShader={bodyFragment}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={glasses}
        args={[glassGeometry, undefined, TV_COUNT]}
        frustumCulled={false}
      >
        <shaderMaterial
          ref={glassMaterial}
          vertexShader={glassVertex}
          fragmentShader={glassFragment}
          uniforms={glassUniforms}
          toneMapped={false}
        />
      </instancedMesh>
      {high && (
        <instancedMesh
          ref={halos}
          args={[haloGeometry, undefined, TV_COUNT]}
          frustumCulled={false}
          renderOrder={2}
        >
          <shaderMaterial
            vertexShader={haloVertex}
            fragmentShader={haloFragment}
            uniforms={haloUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </instancedMesh>
      )}
    </group>
  )
}

/** Re-draws the picture and uploads it. Reuses the buffers; allocates nothing. */
function drawPicture(
  picture: ReturnType<typeof createPicture>,
  look: Look,
  blink: number,
) {
  const { indices, rgba, palette, texture } = picture
  renderPicture(indices, look, blink)
  for (let i = 0; i < indices.length; i++) {
    const c = indices[i] * 3
    const o = i * 4
    rgba[o] = palette[c]
    rgba[o + 1] = palette[c + 1]
    rgba[o + 2] = palette[c + 2]
  }
  texture.needsUpdate = true
}
