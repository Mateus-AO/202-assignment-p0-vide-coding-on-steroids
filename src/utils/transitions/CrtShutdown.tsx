import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, type Mesh, type ShaderMaterial } from 'three'
import { crtShape, type CrtShape } from './crt'
import type { CoverPhase } from './ScreenMosaic'

type Props = {
  getPhase: () => CoverPhase
  /** Plain fade through black, for reduced motion. */
  simple?: boolean
}

const vertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/**
 * A TV shutting down (see `crt.ts` for the timing). Mode 1 draws the lit band: a capsule
 * centered on the screen, `uBand` tall and `uReach * aspect` long on each side of the middle
 * (units: half the screen height). Outside it the screen is black. The band turns from the
 * picture into blue-white as `uLight` rises, and a soft glow hangs around it.
 * Mode 2 (after the swap) and `uSimple` (reduced motion) are a plain fade through black.
 * Fully determined by the uniforms, so it scrubs both ways. Never touches the colors with
 * pow(); the glow is a pair of exponentials of a clamped distance.
 */
const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uMode;
  uniform float uT;
  uniform float uSimple;
  uniform float uBand;
  uniform float uReach;
  uniform float uLight;
  uniform float uGlow;
  uniform float uFade;

  void main() {
    if (uSimple > 0.5 || uMode > 1.5) {
      float a = uMode < 1.5 ? uT : 1.0 - uT;
      gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      #include <colorspace_fragment>
      return;
    }

    float halfH = 0.5 * uRes.y;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / halfH;
    float reach = uReach * (uRes.x / uRes.y);
    vec2 q = vec2(max(abs(p.x) - reach, 0.0), abs(p.y));
    // Signed distance to the lit band, negative inside it.
    float sd = length(q) - uBand;
    float soft = 3.0 / uRes.y;
    float cover = smoothstep(0.0, soft, sd);

    float out_ = max(sd, 0.0);
    float glow = uGlow * (0.6 * exp(-out_ / 0.02) + 0.22 * exp(-out_ / 0.1));

    vec3 lit = vec3(0.55, 0.75, 1.0) * (1.4 * uFade);
    vec3 rgb = mix(lit, vec3(0.0), cover) + vec3(0.25, 0.5, 1.0) * glow;
    float a = max(mix(uLight, 1.0, cover), clamp(glow * 1.5, 0.0, 1.0));
    if (a < 0.001) discard;
    gl_FragColor = vec4(min(rgb, vec3(1.0)), a);
    #include <colorspace_fragment>
  }
`

/**
 * Full-screen overlay for a cover with `style: 'crt'`, drawn after everything else (and after
 * `ScreenMosaic`, which ignores that style). Self-contained: delete this file, `crt.ts` and
 * the one line in `WorldStack` to drop the effect.
 */
export function CrtShutdown({ getPhase, simple = false }: Props) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uRes: { value: new Vector2() },
      uMode: { value: 0 },
      uT: { value: 0 },
      uSimple: { value: 0 },
      uBand: { value: 1 },
      uReach: { value: 1 },
      uLight: { value: 0 },
      uGlow: { value: 0 },
      uFade: { value: 1 },
    }),
    [],
  )
  const buffer = useMemo(() => new Vector2(), [])
  const shape = useMemo<CrtShape>(() => crtShape(0), [])

  useFrame(({ gl }) => {
    const phase = getPhase()
    if (mesh.current) mesh.current.visible = phase.mode !== 0
    // Through the material, so the values land on the uniforms the renderer uploads.
    const u = material.current?.uniforms
    if (!u || phase.mode === 0) return
    gl.getDrawingBufferSize(buffer)
    u.uRes.value.copy(buffer)
    u.uMode.value = phase.mode
    u.uT.value = phase.t
    u.uSimple.value = simple ? 1 : 0
    crtShape(phase.t, shape)
    u.uBand.value = shape.band
    u.uReach.value = shape.reach
    u.uLight.value = shape.light
    u.uGlow.value = shape.glow
    u.uFade.value = shape.fade
  })

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1001} visible={false}>
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
