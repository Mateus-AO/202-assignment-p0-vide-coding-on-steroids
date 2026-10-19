import { useMemo } from 'react'
import { InstancedBlocks } from '@/utils/three/InstancedBlocks'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'
import type { WorldProps } from '@/core/world'
import { Hero } from './Hero'
import { CastleDetails, Coins, GoalFlag, Pipe, QuestionBlock } from './Level'
import { createScenery } from './scenery'
import { createPlatformerMaterials } from './textures'
import { Walker } from './Walker'

export function Platformer({ getU }: Pick<WorldProps, 'getU'>) {
  useSceneAtmosphere({ background: '#6ab7ff' })
  const materials = useMemo(() => createPlatformerMaterials(), [])
  const scenery = useMemo(() => createScenery(), [])

  return (
    <group>
      <InstancedBlocks cells={scenery.cloudsFar} material={materials.cloud} tint={0.08} />
      <InstancedBlocks cells={scenery.clouds} material={materials.cloud} tint={0.05} />
      <InstancedBlocks cells={scenery.hillsFar} material={materials.hillFar} tint={0.1} />
      <InstancedBlocks cells={scenery.hills} material={materials.hill} tint={0.12} />
      <InstancedBlocks cells={scenery.bushes} material={materials.bush} tint={0.15} />
      <InstancedBlocks cells={scenery.ground} material={materials.brick} tint={0.15} />
      <InstancedBlocks cells={scenery.castle} material={materials.castle} tint={0.08} />

      {scenery.pipes.map((x) => (
        <Pipe key={x} x={x} materials={materials} />
      ))}
      <QuestionBlock getU={getU} materials={materials} />
      <Coins getU={getU} materials={materials} />
      <GoalFlag getU={getU} materials={materials} />
      <CastleDetails materials={materials} />
      <Walker materials={materials} />
      <Hero getU={getU} materials={materials} />
    </group>
  )
}
