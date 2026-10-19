import type { Atmosphere } from '@/utils/three/useSceneAtmosphere'

/** One color for background, fog and the sky's horizon, so distance fades into the sky. */
export const HORIZON = '#bfe0ff'

export const atmosphere: Atmosphere = {
  background: HORIZON,
  fog: { color: HORIZON, near: 35, far: 100 },
}
