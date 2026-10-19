import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { clamp, easeInOutCubic } from '@/utils/math'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'

/** Seconds a programmatic scroll (`scrollToProgress`) takes when smooth scrolling is on. */
const GLIDE_SECONDS = 2.4

export type SmoothScroll = {
  /** Locked: the visitor cannot scroll (wheel, touch, keys), but the page can still be moved. */
  setLocked: (locked: boolean) => void
  /** Moves the page to overall progress `progress`: a glide, or a jump in reduced motion. */
  scrollToProgress: (progress: number) => void
}

function createControl(startLocked: boolean) {
  let locked = startLocked
  let lenis: Lenis | null = null
  const apply = () => {
    // `overflow: hidden` on the root stops wheel, touch and keys, yet scrollTo still works.
    document.documentElement.style.overflow = locked ? 'hidden' : ''
    if (locked) lenis?.stop()
    else lenis?.start()
  }
  const control: SmoothScroll & {
    attach: (next: Lenis | null) => void
    release: () => void
  } = {
    attach(next) {
      lenis = next
      apply()
    },
    release() {
      lenis = null
      document.documentElement.style.overflow = ''
    },
    setLocked(next) {
      locked = next
      apply()
    },
    scrollToProgress(progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = clamp(progress, 0, 1) * Math.max(0, max)
      if (lenis) {
        lenis.scrollTo(y, {
          duration: GLIDE_SECONDS,
          easing: easeInOutCubic,
          lock: true,
          force: true,
        })
      } else window.scrollTo(0, y)
    },
  }
  return control
}

type Options = {
  /** Start with scrolling locked (the loading screen); the page also starts at the top. */
  startLocked?: boolean
}

/**
 * Smooth scrolling driven by the gsap ticker. Disabled for reduced motion (native scrolling).
 * `onScroll` receives overall page progress in [0, 1], also once on mount. Returns a handle to
 * lock the scroll and to move it to a progress.
 */
export function useSmoothScroll(
  onScroll: (progress: number) => void,
  { startLocked = false }: Options = {},
): SmoothScroll {
  const reduced = usePrefersReducedMotion()
  const [control] = useState(() => createControl(startLocked))

  useEffect(() => {
    if (startLocked) {
      history.scrollRestoration = 'manual'
      window.scrollTo(0, 0)
    }
  }, [startLocked])

  useEffect(() => {
    const report = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      onScroll(max > 0 ? window.scrollY / max : 0)
    }
    report()

    if (reduced) {
      control.attach(null)
      window.addEventListener('scroll', report, { passive: true })
      return () => {
        window.removeEventListener('scroll', report)
        control.release()
      }
    }

    const lenis = new Lenis()
    control.attach(lenis)
    lenis.on('scroll', report)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      control.release()
    }
  }, [reduced, onScroll, control])

  return control
}
