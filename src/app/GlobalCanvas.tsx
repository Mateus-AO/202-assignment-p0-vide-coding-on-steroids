import { Canvas } from '@react-three/fiber'
import { CameraRig, WorldStack } from './WorldStack'
import type { QualityTier } from '@/utils/three/quality'

/** One fixed canvas behind the page; the scroll drives everything in it. */
export function GlobalCanvas({ quality }: { quality: QualityTier }) {
  return (
    <div className="fixed inset-0">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 12] }}
        dpr={quality === 'high' ? [1, 2] : 1}
      >
        <CameraRig />
        <WorldStack quality={quality} />
      </Canvas>
    </div>
  )
}
