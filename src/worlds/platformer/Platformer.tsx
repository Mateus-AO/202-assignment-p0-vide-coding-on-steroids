import { useMemo } from 'react'
import { InstancedBlocks } from '@/utils/three/InstancedBlocks'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import type { WorldProps } from '@/core/world'
import { Backdrop, Layer } from './Backdrop'
import { CastleDetails } from './Castle'
import { DETAIL, PARALLAX, SKY } from './config'
import { ContactShadows, Sparkles } from './Effects'
import { Hero } from './Hero'
import { Coins, GoalFlag, Pipe, QuestionBlock } from './Level'
import { createScenery } from './scenery'
import { createPlatformerMaterials } from './textures'
import { Walker } from './Walker'

/**
 * The level. It reads `quality` (low drops the far backdrop, the torches and the sparkles, and
 * spaces the hills and clouds out) and reduced motion (nothing bobs, spins, flickers or bursts).
 */
export function Platformer({ getU, quality }: WorldProps) {
  useSceneAtmosphere({ background: SKY.background })
  const calm = usePrefersReducedMotion()
  const detail = DETAIL[quality]
  const materials = useMemo(() => createPlatformerMaterials(), [])
  const scenery = useMemo(() => createScenery(quality), [quality])

  return (
    <group>
      <Backdrop materials={materials} />
      <Layer getU={getU} follow={PARALLAX.mountains}>
        <InstancedBlocks
          cells={scenery.mountains}
          material={materials.mountain}
          tint={0.08}
        />
      </Layer>
      <Layer getU={getU} follow={PARALLAX.cloudsFar}>
        <InstancedBlocks
          cells={scenery.cloudsFar}
          material={materials.cloud}
          tint={0.06}
        />
      </Layer>
      <Layer getU={getU} follow={PARALLAX.clouds}>
        <InstancedBlocks cells={scenery.clouds} material={materials.cloud} tint={0.05} />
      </Layer>
      <Layer getU={getU} follow={PARALLAX.hillsFar}>
        <InstancedBlocks
          cells={scenery.hillsFar}
          material={materials.hillFar}
          tint={0.1}
        />
      </Layer>
      <InstancedBlocks cells={scenery.hills} material={materials.hill} tint={0.12} />
      <InstancedBlocks cells={scenery.bushes} material={materials.bush} tint={0.15} />
      <InstancedBlocks cells={scenery.groundA} material={materials.groundA} tint={0.12} />
      <InstancedBlocks cells={scenery.groundB} material={materials.groundB} tint={0.2} />
      <InstancedBlocks
        cells={scenery.groundDeep}
        material={materials.groundDeep}
        tint={0.15}
      />
      <InstancedBlocks
        cells={scenery.groundDeeper}
        material={materials.groundDeeper}
        tint={0.15}
      />
      <InstancedBlocks
        cells={scenery.groundDeepest}
        material={materials.groundDeepest}
        tint={0.15}
      />
      <InstancedBlocks cells={scenery.bricks} material={materials.brick} />
      <InstancedBlocks cells={scenery.castle} material={materials.castle} tint={0.08} />
      <ContactShadows materials={materials} />

      {scenery.pipes.map((x) => (
        <Pipe key={x} x={x} materials={materials} />
      ))}
      <QuestionBlock getU={getU} materials={materials} calm={calm} />
      <Coins getU={getU} materials={materials} calm={calm} />
      <GoalFlag getU={getU} materials={materials} calm={calm} />
      <CastleDetails getU={getU} materials={materials} quality={quality} calm={calm} />
      <Walker getU={getU} materials={materials} calm={calm} />
      <Hero getU={getU} materials={materials} calm={calm} />
      {detail.particles && !calm && <Sparkles getU={getU} materials={materials} />}
    </group>
  )
}
