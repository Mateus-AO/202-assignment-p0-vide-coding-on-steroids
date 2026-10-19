import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, Fog } from 'three'

export type Atmosphere = {
  background?: string
  fog?: { color: string; near: number; far: number }
}

/**
 * Background color and linear fog for the scene this module lives in (root or a portal).
 * Both are restored on unmount, so a world can move between the two without leaking.
 */
export function useSceneAtmosphere({ background, fog }: Atmosphere) {
  const scene = useThree((s) => s.scene)
  const fogColor = fog?.color
  const fogNear = fog?.near
  const fogFar = fog?.far

  /* eslint-disable react-hooks/immutability -- three.js scenes are mutable by design */
  useEffect(() => {
    if (!background) return
    const previous = scene.background
    scene.background = new Color(background)
    return () => {
      scene.background = previous
    }
  }, [scene, background])

  useEffect(() => {
    if (fogColor === undefined || fogNear === undefined || fogFar === undefined) return
    const previous = scene.fog
    scene.fog = new Fog(fogColor, fogNear, fogFar)
    return () => {
      scene.fog = previous
    }
  }, [scene, fogColor, fogNear, fogFar])
  /* eslint-enable react-hooks/immutability */
}
