import type { WorldProps } from '@/core/world'
import { useSceneAtmosphere } from '@/utils/three/useSceneAtmosphere'

/** CONTRACT (scene agent implements; this is a stub): the pile of old TV sets. */
export function Wall({ getU, quality }: WorldProps) {
  void getU
  void quality
  useSceneAtmosphere({ background: '#000000' })
  return null
}
