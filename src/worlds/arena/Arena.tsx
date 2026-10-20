import type { WorldProps } from '@/core/world'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { Cast } from './Characters'
import { Ring, Sparks } from './Ring'
import { Floor, Props, Walls } from './Stage'

/** The void around the arena. */
export const BACKGROUND = '#0d0a17'

/**
 * The arena: a flagstone floor with a low wall and four gates, a few props, the cast and the
 * merge ring. It reads `quality` (low drops the ring's glow and breathing, and the sparks) and
 * reduced motion (no hops, strides, spinning, flames or sparks; poses still follow progress).
 */
export function Arena({ getU, quality }: WorldProps) {
  useSceneAtmosphere({ background: BACKGROUND })
  const calm = usePrefersReducedMotion()
  return (
    <group>
      <Floor />
      <Walls getU={getU} calm={calm} />
      <Props getU={getU} calm={calm} />
      <Ring getU={getU} quality={quality} calm={calm} />
      <Cast getU={getU} calm={calm} />
      {quality === 'high' && !calm && <Sparks getU={getU} />}
    </group>
  )
}
