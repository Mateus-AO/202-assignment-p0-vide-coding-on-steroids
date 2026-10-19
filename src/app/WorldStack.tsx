import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshPortalMaterial } from '@react-three/drei'
import type { Group, Mesh, Object3D } from 'three'
import { markReady, READY_NEXT_WORLD } from '@/core/readiness'
import type { PortalExit, WorldModule } from '@/core/world'
import type { QualityTier } from '@/utils/three/quality'
import { CrtShutdown } from '@/utils/transitions/CrtShutdown'
import { ScreenMosaic, type CoverPhase } from '@/utils/transitions/ScreenMosaic'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { getFrame, useAppStore } from './store'
import { worlds } from './worlds'

const getU = () => getFrame().u
const getZero = () => 0
const COVER_OFF: CoverPhase = { mode: 0, t: 0 }
/** The mosaic draws every cover except the CRT shutdown, which `CrtShutdown` draws. */
const getCover = () => {
  const cover = getFrame().cover
  return cover.style === 'crt' ? COVER_OFF : cover
}
const getCrt = () => {
  const cover = getFrame().cover
  return cover.style === 'crt' ? cover : COVER_OFF
}

/** Moves the camera along the active world's path. */
export function CameraRig() {
  useFrame(({ camera, size }) => {
    const { position, target } = getFrame().pose(size.width / size.height)
    camera.position.set(...position)
    camera.lookAt(...target)
  })
  return null
}

type GateProps = { exit: PortalExit; next: WorldModule; quality: QualityTier }

function PortalGate({ exit, next, quality }: GateProps) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<ComponentRef<typeof MeshPortalMaterial>>(null)

  useFrame(() => {
    const portal = getFrame().portal
    if (mesh.current) mesh.current.visible = portal?.open ?? false
    if (material.current) material.current.blend = portal?.blend ?? 0
  })

  // The portal scene shares the mesh's frame, so shift the next world until its
  // camera start sits on the portal plane. The start depends on the aspect (Pong pulls back
  // on narrow screens), so use the real one or the swap would jump.
  const size = useThree((s) => s.size)
  const start = next.cameraPath(0, size.width / size.height).position

  // Compile the next world's shaders now, so opening the portal does not hitch, and tell the
  // loading screen it is ready.
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const probe = useRef<Group>(null)
  useEffect(() => {
    const settle = () => markReady(READY_NEXT_WORLD)
    let root: Object3D | null = probe.current
    while (root?.parent) root = root.parent
    if (!root) return settle()
    gl.compileAsync(root, camera).then(settle, settle)
  }, [gl, camera])

  return (
    <mesh ref={mesh} position={exit.position} visible={false}>
      <planeGeometry args={exit.size} />
      <MeshPortalMaterial ref={material} blur={0} resolution={512}>
        <group ref={probe} position={[-start[0], -start[1], -start[2]]}>
          <next.Scene getU={getZero} quality={quality} />
        </group>
      </MeshPortalMaterial>
    </mesh>
  )
}

/** Renders the active world and, inside its portal, the next one. Nothing else is mounted. */
export function WorldStack({ quality }: { quality: QualityTier }) {
  const index = useAppStore((s) => s.frame.index)
  const reduced = usePrefersReducedMotion()
  const world = worlds[index]
  const next = worlds[index + 1]

  return (
    <>
      <group key={world.id}>
        <world.Scene getU={getU} quality={quality} />
        {world.exit?.kind === 'portal' && next && (
          <PortalGate exit={world.exit} next={next} quality={quality} />
        )}
      </group>
      <ScreenMosaic getPhase={getCover} simple={reduced} />
      <CrtShutdown getPhase={getCrt} simple={reduced} />
    </>
  )
}
