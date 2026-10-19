import { useCallback, useEffect, useState } from 'react'
import { GlobalCanvas } from './GlobalCanvas'
import { Captions } from './Captions'
import { SoundControl } from './SoundControl'
import { useAppStore } from './store'
import { SCROLL_VH_PER_WORLD, worlds } from './worlds'
import { frameAt } from '@/core/timeline'
import { WebGLFallback } from '@/components/WebGLFallback'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { useSmoothScroll } from '@/utils/scroll/useSmoothScroll'
import { detectQuality } from '@/utils/three/quality'
import { isWebGLAvailable } from '@/utils/three/webgl'

export function App() {
  const reduced = usePrefersReducedMotion()
  const [quality] = useState(detectQuality)

  const onScroll = useCallback(
    (progress: number) =>
      useAppStore.getState().setFrame(frameAt(worlds, progress, { reduced })),
    [reduced],
  )
  useSmoothScroll(onScroll)

  // Dev only: `?progress=0.6` pins the scene at that overall progress (handy for screenshots).
  const pinned = import.meta.env.DEV
    ? Number(new URLSearchParams(location.search).get('progress'))
    : NaN
  useEffect(() => {
    if (Number.isFinite(pinned) && pinned > 0) onScroll(pinned)
  }, [pinned, onScroll])

  if (!isWebGLAvailable()) {
    return <WebGLFallback className="min-h-screen" />
  }

  return (
    <>
      <GlobalCanvas quality={quality} />
      <Captions />
      <SoundControl quality={quality} />
      <div aria-hidden style={{ height: `${worlds.length * SCROLL_VH_PER_WORLD}vh` }} />
    </>
  )
}
