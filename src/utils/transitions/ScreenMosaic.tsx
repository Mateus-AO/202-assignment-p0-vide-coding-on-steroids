import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DataTexture,
  NearestFilter,
  RGBAFormat,
  Vector2,
  type Mesh,
  type ShaderMaterial,
} from 'three'
import { crackAtlasData } from './crackAtlas'

export type CoverPhase = {
  /** 0 = off, 1 = white covering the screen, 2 = white clearing into the mosaic. */
  mode: 0 | 1 | 2
  /** Progress through the current phase, [0, 1]. */
  t: number
}

type Props = {
  getPhase: () => CoverPhase
  /** How many rows of squares fit the screen height; the square size follows the screen. */
  rows?: number
  /** Plain fade through black, for reduced motion. */
  simple?: boolean
}

const CRACK_STAGES = 10
const CRACK_SIZE = 16

const vertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/**
 * Screen grid of squares, centered on the screen.
 * Covering: white spreads out from the center until the screen is solid white.
 * Clearing: white retreats outward, leaving a large ragged central cluster of broken squares
 * (transparent: the world underneath shows) among unbroken ones (black). Each black square
 * then breaks like a Minecraft block: staged cracks grow over it, and after the last stage
 * it is gone. Squares start center-out in shuffled order and overlap, so several crack at
 * once, and everything is gone by t = 1. Fully determined by `uT`, so it scrubs both ways.
 */
const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uCell;
  uniform float uMode;
  uniform float uT;
  uniform float uSimple;
  uniform float uStages;
  uniform sampler2D uCrack;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    if (uSimple > 0.5) {
      float a = uMode < 1.5 ? uT : 1.0 - uT;
      gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      #include <colorspace_fragment>
      return;
    }

    vec2 cells = ceil(uRes / uCell);
    vec2 cell = floor(gl_FragCoord.xy / uCell);
    float d = length(cell - (cells - 1.0) * 0.5) / (0.5 * length(cells));
    float h = hash(cell);

    float white;
    float underAlpha = 0.0;
    vec3 under = vec3(0.0);
    if (uMode < 1.5) {
      white = clamp((uT * 1.5 - (d + h * 0.2)) * 4.0, 0.0, 1.0);
    } else {
      float clear = smoothstep(0.0, 0.3, uT);
      white = 1.0 - clamp((clear * 1.5 - (d + h * 0.2)) * 4.0, 0.0, 1.0);

      // About 55% of a 16:9 screen starts out broken (radius 0.57 of the half diagonal).
      bool cluster = d + (h - 0.5) * 0.35 < 0.57;

      // Breaking: starts at breakStart (nearest the cluster first), takes half the timeline (the last one finishes just before t = 1).
      float timeline = clamp((uT - 0.2) / 0.8, 0.0, 1.0);
      float breakStart = max(d - 0.4, 0.0) * 0.45 + h * 0.2;
      float crack = clamp((timeline - breakStart) / 0.5, 0.0, 1.0);

      if (!cluster && crack < 1.0) {
        underAlpha = 1.0;
        if (crack > 0.0) {
          // Pick the stage, and flip/transpose the texture per square so they differ.
          float stage = min(floor(crack * uStages), uStages - 1.0);
          vec2 st = fract(gl_FragCoord.xy / uCell) * 0.999;
          if (h > 0.5) st.x = 0.999 - st.x;
          if (fract(h * 7.0) > 0.5) st.y = 0.999 - st.y;
          if (fract(h * 13.0) > 0.5) st = st.yx;
          float lit = texture2D(uCrack, vec2((stage + st.x) / uStages, st.y)).a;
          under = vec3(lit);
        }
      }
    }

    // White over (a black or cracked square, or nothing).
    float alpha = white + underAlpha * (1.0 - white);
    if (alpha < 0.001) discard;
    gl_FragColor = vec4((vec3(white) + under * underAlpha * (1.0 - white)) / alpha, alpha);
    #include <colorspace_fragment>
  }
`

/** Full-screen overlay, drawn after everything else. Reusable by any world's exit. */
export function ScreenMosaic({ getPhase, rows = 6, simple = false }: Props) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const crackAtlas = useMemo(() => {
    const texture = new DataTexture(
      crackAtlasData(CRACK_STAGES, CRACK_SIZE),
      CRACK_STAGES * CRACK_SIZE,
      CRACK_SIZE,
      RGBAFormat,
    )
    texture.magFilter = texture.minFilter = NearestFilter
    texture.needsUpdate = true
    return texture
  }, [])
  useEffect(() => () => crackAtlas.dispose(), [crackAtlas])
  const uniforms = useMemo(
    () => ({
      uRes: { value: new Vector2() },
      uCell: { value: 0 },
      uMode: { value: 0 },
      uT: { value: 0 },
      uSimple: { value: 0 },
      uStages: { value: CRACK_STAGES },
      uCrack: { value: crackAtlas },
    }),
    [crackAtlas],
  )
  const buffer = useMemo(() => new Vector2(), [])

  useFrame(({ gl, size }) => {
    const phase = getPhase()
    if (mesh.current) mesh.current.visible = phase.mode !== 0
    const u = material.current?.uniforms
    if (!u || phase.mode === 0) return
    gl.getDrawingBufferSize(buffer)
    u.uRes.value.copy(buffer)
    // Keep the squares on an 8px grid, like the rest of the pixel look.
    const cssCell = Math.max(8, Math.round(size.height / rows / 8) * 8)
    u.uCell.value = cssCell * gl.getPixelRatio()
    u.uMode.value = phase.mode
    u.uT.value = phase.t
    u.uSimple.value = simple ? 1 : 0
  })

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1000} visible={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
