import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, type Mesh, type ShaderMaterial } from 'three'

/**
 * `mosaic`: white, then broken squares. `black`: a plain fade through black. `crt`: a TV
 * shutting down (drawn by `CrtShutdown`; the mosaic skips it).
 */
export type CoverStyle = 'mosaic' | 'black' | 'crt'

export type CoverPhase = {
  /** 0 = off, 1 = white covering the screen, 2 = white clearing into the mosaic. */
  mode: 0 | 1 | 2
  /** Progress through the current phase, [0, 1]. */
  t: number
  /** Defaults to `mosaic`. With `black`, mode 1 fades to black and mode 2 fades back. */
  style?: CoverStyle
}

type Props = {
  getPhase: () => CoverPhase
  /** How many rows of squares fit the screen height; the square size follows the screen. */
  rows?: number
  /** Plain fade through black, for reduced motion. */
  simple?: boolean
}

const vertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/**
 * Screen grid of squares, centered on the screen.
 * Covering: white spreads out from the center until the screen is solid white.
 * Clearing: white retreats outward in shuffled order over the first 30% of the
 * phase, leaving a large ragged central cluster of see-through squares where the
 * world shows through; the overlay is empty by then and stays transparent to t = 1.
 * Fully determined by `uT`, so it scrubs both ways.
 */
const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uCell;
  uniform float uMode;
  uniform float uT;
  uniform float uSimple;

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
    if (uMode < 1.5) {
      white = clamp((uT * 1.5 - (d + h * 0.2)) * 4.0, 0.0, 1.0);
    } else {
      float clear = min(uT / 0.3, 1.0);
      white = 1.0 - clamp((clear * 1.5 - (d + h * 0.2)) * 4.0, 0.0, 1.0);
    }
    if (white < 0.001) discard;
    gl_FragColor = vec4(vec3(1.0), white);
    #include <colorspace_fragment>
  }
`

/** Full-screen overlay, drawn after everything else. Reusable by any world's exit. */
export function ScreenMosaic({ getPhase, rows = 6, simple = false }: Props) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uRes: { value: new Vector2() },
      uCell: { value: 0 },
      uMode: { value: 0 },
      uT: { value: 0 },
      uSimple: { value: 0 },
    }),
    [],
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
    u.uSimple.value = simple || phase.style === 'black' ? 1 : 0
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
