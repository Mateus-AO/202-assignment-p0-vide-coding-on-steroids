import { useCallback, useEffect, useRef, useState } from 'react'
import { GlobalCanvas } from './GlobalCanvas'
import { Captions } from './Captions'
import { MergeTitle } from './MergeTitle'
import { Footer } from './Footer'
import { PlayGate } from './PlayGate'
import { SoundControl } from './SoundControl'
import { useAppStore } from './store'
import { SCROLL_VH_PER_WORLD, worlds } from './worlds'
import { frameAt, totalScrollWeight } from '@/core/timeline'
import { skipBoot } from '@/worlds/starter'
import { WebGLFallback } from '@/components/WebGLFallback'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import { scrollEnd } from '@/utils/scroll/progress'
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

  // Progress goes 0 to 1 over the spacer only; the footer after it scrolls with progress at 1.
  const spacer = useRef<HTMLDivElement>(null)
  const spacerEnd = useCallback(
    () =>
      scrollEnd(
        spacer.current
          ? spacer.current.getBoundingClientRect().bottom + window.scrollY
          : document.documentElement.scrollHeight,
        window.innerHeight,
      ),
    [],
  )

  // The page starts on the loading screen with scrolling locked until Play is pressed.
  const scroll = useSmoothScroll(onScroll, {
    startLocked: !isPinned,
    scrollEnd: spacerEnd,
  })
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
      <MergeTitle />
      <PlayGate scroll={scroll} />
      <SoundControl quality={quality} />
      <div
        ref={spacer}
        aria-hidden
        style={{ height: `${totalScrollWeight(worlds) * SCROLL_VH_PER_WORLD}vh` }}
      />
      <Footer scroll={scroll} />
    </>
  )
}
