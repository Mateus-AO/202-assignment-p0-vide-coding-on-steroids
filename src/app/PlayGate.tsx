import { useSyncExternalStore } from 'react'
import { progressPast } from '@/core/timeline'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import type { SmoothScroll } from '@/utils/scroll/useSmoothScroll'
import { BUTTON_UNTIL, playButtonSpot, useStarterStore } from '@/worlds/starter'
import { useAppStore } from './store'
import { worlds } from './worlds'

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}
const getAspect = () => window.innerWidth / window.innerHeight

/**
 * The Play button on the loading screen's CRT: a real button over the canvas. It is disabled
 * until the screen has finished loading. Pressing it unlocks the scroll and glides to the end of
 * the first world (the fly-in), so the move stays scroll-driven. It does not touch sound.
 */
export function PlayGate({ scroll }: { scroll: SmoothScroll }) {
  const reduced = usePrefersReducedMotion()
  const booted = useStarterStore((s) => s.booted)
  const waiting = useAppStore((s) => s.frame.index === 0 && s.frame.u < BUTTON_UNTIL)
  const aspect = useSyncExternalStore(subscribe, getAspect, () => 16 / 9)
  if (!waiting) return null

  const spot = playButtonSpot(aspect)
  const play = () => {
    useStarterStore.getState().setPlayed()
    scroll.setLocked(false)
    scroll.scrollToProgress(progressPast(worlds, 0, { reduced }))
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <button
        type="button"
        disabled={!booted}
        onClick={play}
        aria-label={
          booted ? 'Play: start the scroll through the worlds' : 'Play (still loading)'
        }
        className="font-pixel pointer-events-auto absolute min-h-12 min-w-36 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-4 border-[#ffd84d] bg-black/80 px-6 py-3 text-base text-[#ffd84d] shadow-[0_0_18px_rgb(255_216_77/0.35)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white enabled:hover:bg-[#ffd84d] enabled:hover:text-black disabled:cursor-wait disabled:border-[#2f8f4d] disabled:text-[#2f8f4d] disabled:shadow-none"
        style={{ left: `${spot.left * 100}%`, top: `${spot.top * 100}%` }}
      >
        PLAY
      </button>
      <span role="status" className="sr-only">
        {booted ? 'Ready. Press Play.' : 'Loading.'}
      </span>
    </div>
  )
}
