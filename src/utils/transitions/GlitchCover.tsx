import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2, type Mesh, type ShaderMaterial } from 'three'
import type { QualityTier } from '@/utils/three/quality'
import {
  GLITCH_BAR_DENSITY,
  GLITCH_BLOCK_DENSITY,
  glitchShape,
  type GlitchShape,
} from './glitch'
import type { CoverPhase } from './ScreenMosaic'

type Props = {
  getPhase: () => CoverPhase
  quality: QualityTier
  /** Plain fade through black, for reduced motion. */
  simple?: boolean
}

const vertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/**
 * A screen glitch built without sampling the scene (see `glitch.ts` for the timing and the
 * flash-safety reasoning). Three kinds of dark shape take the picture away: horizontal bands
 * of three row counts (each band has a hashed centre and a width that grows with `uCover`)
 * and a coarse grid of blocks. A shape decides to be dark with a threshold hash that does not
 * depend on `uStep`, so once dark it stays dark; only its small displacement changes per step.
 * Lit things come on top: thin coloured bars (cyan, magenta, yellow) whose red, green and
 * blue channels are shifted by `uSplit` (the channel split), coloured blocks, and one bright
 * fringe line on each end of a band. The dark ground has scanlines and, on the high tier,
 * block noise. Everything is a hash of cell, step and seed, so it is the same every time.
 * `uSimple` (reduced motion) is a plain fade through black.
 */
const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uMode;
  uniform float uT;
  uniform float uSimple;
  uniform float uCover;
  uniform float uActivity;
  uniform float uSplit;
  uniform float uStep;
  uniform float uSeed;
  uniform float uPx;
  uniform float uBarDensity;
  uniform float uBlockDensity;
  uniform float uFine;
  uniform float uNoise;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // x: 1 inside a dark band of this layer. y: 1 on its left fringe, z: on its right fringe.
  vec3 band(vec2 uv, float rows, float layer, float offset, float gain, float fringe) {
    float r = floor(uv.y * rows + offset);
    float id = layer * 37.0 + uSeed * 5.0;
    // Threshold and extent do not depend on the step: dark never flickers back to clear.
    float on = step(hash(vec2(r, id)), uCover * 1.12 - 0.04 - gain);
    float wide = smoothstep(0.55, 0.85, uCover);
    float w = mix((0.25 + 0.6 * hash(vec2(r, id + 1.0))) * uCover * 1.7, 2.0, wide);
    // Only the displacement changes per step, and it dies out as the screen goes opaque.
    float jitter = (hash(vec2(r, id + 2.0 + uStep * 3.7)) - 0.5) * 0.07 * (1.0 - wide);
    float centre = hash(vec2(r, id + 3.0)) + jitter;
    float d = uv.x - centre;
    float inside = on * step(abs(d), 0.5 * w);
    float edge = fringe / uRes.x;
    float left = inside * step(d + 0.5 * w, edge);
    float right = inside * step(0.5 * w - d, edge);
    return vec3(inside, left, right);
  }

  float block(vec2 frag, float cell, float gain) {
    vec2 c = floor(frag / cell);
    return step(hash(c + uSeed * 9.0), uCover * 1.1 - 0.1 - gain);
  }

  // Lit bar mask of one colour channel; 'shift' is that channel's offset (the split).
  float barMask(vec2 uv, float rows, float shift) {
    float r = floor(uv.y * rows);
    float s = floor(uStep);
    float on = step(hash(vec2(r, s * 1.31 + uSeed)), uActivity * uBarDensity * 2.5);
    float x0 = hash(vec2(r, s * 2.17 + uSeed + 40.0));
    float len = 0.15 + 0.5 * hash(vec2(r, s * 0.73 + uSeed + 80.0));
    return on * step(x0, uv.x - shift) * step(uv.x - shift, x0 + len);
  }

  vec3 tint(float k) {
    if (k < 0.34) return vec3(0.0, 0.8, 0.9);
    if (k < 0.67) return vec3(0.9, 0.1, 0.75);
    return vec3(0.9, 0.8, 0.1);
  }

  void main() {
    if (uSimple > 0.5) {
      float a = uMode < 1.5 ? uT : 1.0 - uT;
      gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      #include <colorspace_fragment>
      return;
    }

    vec2 uv = gl_FragCoord.xy / uRes;
    float px = uPx;

    // Dark shapes: three band layers, one block layer.
    vec3 b0 = band(uv, 5.0, 0.0, 0.31, 0.0, 5.0 * px);
    vec3 b1 = band(uv, 13.0, 1.0, 0.57, 0.04, 4.0 * px);
    vec3 b2 = uFine > 0.5 ? band(uv, 34.0, 2.0, 0.13, 0.1, 3.0 * px) : vec3(0.0);
    float cell = max(16.0, floor(uRes.y / px / 64.0 + 0.5) * 8.0) * px;
    float blocks = block(gl_FragCoord.xy, cell, 0.15);
    float dark = max(max(b0.x, b1.x), max(b2.x, blocks));
    dark = max(dark, step(0.999, uCover));

    // The ground: near-black with scanlines, plus block noise on the high tier.
    float scan = mod(floor(gl_FragCoord.y / px), 3.0) < 1.0 ? 1.6 : 1.0;
    vec3 ground = vec3(0.004, 0.005, 0.009) * scan;
    if (uNoise > 0.5) {
      float n = hash(floor(gl_FragCoord.xy / (8.0 * px)) + uStep * 13.0 + uSeed);
      ground += vec3(0.4, 0.7, 1.0) * (0.012 * step(0.7, n) * (0.5 + n));
    }
    vec3 rgb = ground * dark;
    float a = dark;

    if (uActivity > 0.001) {
      // Coloured bars with the three channels shifted apart.
      float rows = uFine > 0.5 ? 46.0 : 24.0;
      float rowId = floor(uv.y * rows);
      vec3 tone = tint(hash(vec2(rowId, floor(uStep) * 1.9 + uSeed + 7.0)));
      vec3 bar = vec3(
        barMask(uv, rows, uSplit),
        barMask(uv, rows, 0.0),
        barMask(uv, rows, -uSplit)
      ) * tone;
      float barA = max(bar.r, max(bar.g, bar.b));

      // Coloured blocks, dim, on the coarse grid.
      vec2 bc = floor(gl_FragCoord.xy / (cell * 0.5));
      float bk = step(hash(bc + floor(uStep) * 5.3 + uSeed * 3.0), uActivity * uBlockDensity);
      vec3 blockRgb = tint(hash(bc + 71.0 + floor(uStep))) * 0.5 * bk;

      // Fringe lines on the ends of the bands: cyan on the left, magenta on the right.
      float fl = max(b0.y, max(b1.y, b2.y));
      float fr = max(b0.z, max(b1.z, b2.z));
      vec3 fringe = vec3(0.0, 0.8, 0.9) * fl + vec3(0.9, 0.1, 0.75) * fr;
      float fringeA = max(fl, fr) * uActivity;

      rgb = mix(rgb, blockRgb, bk * 0.85);
      a = max(a, bk * 0.85);
      rgb = mix(rgb, fringe, fringeA);
      a = max(a, fringeA);
      rgb = mix(rgb, bar, barA);
      a = max(a, barA);
    }

    if (a < 0.001) discard;
    gl_FragColor = vec4(min(rgb, vec3(1.0)), a);
    #include <colorspace_fragment>
  }
`

/**
 * Full-screen overlay for a cover with `style: 'glitch'`, drawn after everything else (the
 * mosaic ignores that style). Self-contained: delete this file, `glitch.ts` and the lines in
 * `WorldStack` to drop the effect. `WorldStack` mounts it only on the two worlds the cover
 * sits between, so it costs nothing elsewhere.
 */
export function GlitchCover({ getPhase, quality, simple = false }: Props) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uRes: { value: new Vector2() },
      uMode: { value: 0 },
      uT: { value: 0 },
      uSimple: { value: 0 },
      uCover: { value: 0 },
      uActivity: { value: 0 },
      uSplit: { value: 0 },
      uStep: { value: 0 },
      uSeed: { value: 0 },
      uPx: { value: 1 },
      uBarDensity: { value: GLITCH_BAR_DENSITY },
      uBlockDensity: { value: GLITCH_BLOCK_DENSITY },
      uFine: { value: quality === 'high' ? 1 : 0 },
      uNoise: { value: quality === 'high' ? 1 : 0 },
    }),
    [quality],
  )
  const buffer = useMemo(() => new Vector2(), [])
  const shape = useMemo<GlitchShape>(() => glitchShape(1, 0), [])

  // Compile now, while the cover is still hidden, so the first glitch frame does not hitch.
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const target = mesh.current
    if (target) gl.compileAsync(target, camera).catch(() => {})
  }, [gl, camera])

  useFrame(({ gl: renderer }) => {
    const phase = getPhase()
    if (mesh.current) mesh.current.visible = phase.mode !== 0
    // Through the material, so the values land on the uniforms the renderer uploads.
    const u = material.current?.uniforms
    if (!u || phase.mode === 0) return
    renderer.getDrawingBufferSize(buffer)
    u.uRes.value.copy(buffer)
    u.uMode.value = phase.mode
    u.uT.value = phase.t
    u.uSimple.value = simple ? 1 : 0
    u.uPx.value = renderer.getPixelRatio()
    glitchShape(phase.mode, phase.t, shape)
    u.uCover.value = shape.cover
    u.uActivity.value = shape.activity
    u.uSplit.value = shape.split
    u.uStep.value = shape.step
    u.uSeed.value = shape.seed
  })

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1002} visible={false}>
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
