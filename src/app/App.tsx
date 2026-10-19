import { useCallback, useEffect, useState } from 'react'
import { GlobalCanvas } from './GlobalCanvas'
import { Captions } from './Captions'
import { PlayGate } from './PlayGate'
import { SoundControl } from './SoundControl'
import { useAppStore } from './store'
import { SCROLL_VH_PER_WORLD, worlds } from './worlds'
import { frameAt, totalScrollWeight } from '@/core/timeline'
import { skipBoot } from '@/worlds/starter'
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

  // Dev only: `?progress=0.6` pins the scene at that overall progress (handy for screenshots).
  const pinned = import.meta.env.DEV
    ? Number(new URLSearchParams(location.search).get('progress'))
    : NaN
  const isPinned = Number.isFinite(pinned) && pinned > 0

  // The page starts on the loading screen with scrolling locked until Play is pressed.
  const scroll = useSmoothScroll(onScroll, { startLocked: !isPinned })
  useEffect(() => {
    if (!isPinned) return
    skipBoot()
    scroll.setLocked(false)
    onScroll(pinned)
  }, [isPinned, pinned, onScroll, scroll])

  if (!isWebGLAvailable()) {
    return <WebGLFallback className="min-h-screen" />
  }

  return (
    <>
      <GlobalCanvas quality={quality} />
      <Captions />
      <PlayGate scroll={scroll} />
      <SoundControl quality={quality} />
      <div
        aria-hidden
        style={{ height: `${totalScrollWeight(worlds) * SCROLL_VH_PER_WORLD}vh` }}
      />
    </>
  )
}
