import { VoxelDebris } from '@/utils/transitions/VoxelDebris'
import type { WorldProps } from '@/core/world'
import { beats } from './beats'
import { creeperSpot } from './creeper'

const [x, y, z] = creeperSpot
const ORIGIN: [number, number, number] = [x, y + 1.5, z]

/** Burst of fire-colored cubes where the creature blows up. */
export function Explosion({ getU }: Pick<WorldProps, 'getU'>) {
  const progress = () => beats.smooth('blast', getU())
  return (
    <>
      <VoxelDebris
        position={ORIGIN}
        spread={1.5}
        size={0.6}
        color="#ff9a1f"
        getProgress={progress}
        count={48}
        seed={1}
      />
      <VoxelDebris
        position={ORIGIN}
        spread={1.5}
        size={0.45}
        color="#ffe14d"
        getProgress={progress}
        count={40}
        seed={2}
      />
      <VoxelDebris
        position={ORIGIN}
        spread={1.5}
        size={0.7}
        color="#5b5b5b"
        getProgress={progress}
        count={32}
        seed={3}
      />
    </>
  )
}
