import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { easeInOutCubic } from '@/utils/math'
import { progressAtScroll, scrollForProgress } from './progress'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'

/** Seconds a programmatic scroll (`scrollToProgress`) takes when smooth scrolling is on. */
const GLIDE_SECONDS = 2.4

export type SmoothScroll = {
  /** Locked: the visitor cannot scroll (wheel, touch, keys), but the page can still be moved. */
  setLocked: (locked: boolean) => void
  /** Moves the page to overall progress `progress`: a glide, or a jump in reduced motion. */
  scrollToProgress: (progress: number) => void
  /** Jumps to the very top of the page at once (no glide, also in reduced motion). */
  scrollToTop: () => void
}

/** Where progress reaches 1, as a scroll offset. The default is the bottom of the page. */
export type ScrollEnd = () => number

const pageEnd: ScrollEnd = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

function createControl(startLocked: boolean) {
  let locked = startLocked
  let lenis: Lenis | null = null
  let endOf: ScrollEnd = pageEnd
  const apply = () => {
    // `overflow: hidden` on the root stops wheel, touch and keys, yet scrollTo still works.
    document.documentElement.style.overflow = locked ? 'hidden' : ''
    if (locked) lenis?.stop()
    else lenis?.start()
  }
  const control: SmoothScroll & {
    attach: (next: Lenis | null) => void
    setScrollEnd: (next: ScrollEnd) => void
    progress: () => number
    release: () => void
  } = {
    attach(next) {
      lenis = next
      apply()
    },
    setScrollEnd(next) {
      endOf = next
    },
    progress() {
      return progressAtScroll(window.scrollY, endOf())
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
      const y = scrollForProgress(progress, endOf())
      if (lenis) {
        lenis.scrollTo(y, {
          duration: GLIDE_SECONDS,
          easing: easeInOutCubic,
          lock: true,
          force: true,
        })
      } else window.scrollTo(0, y)
    },
    scrollToTop() {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
      else window.scrollTo({ top: 0, behavior: 'instant' })
    },
  }
  return control
}

type Options = {
  /** Start with scrolling locked (the loading screen); the page also starts at the top. */
  startLocked?: boolean
  /**
   * The scroll offset where progress reaches 1 (default: the bottom of the page). Content after
   * the scroll space, such as the footer, is then scrolled through with progress held at 1.
   * Must be stable between renders.
   */
  scrollEnd?: ScrollEnd
}

/**
 * Smooth scrolling driven by the gsap ticker. Disabled for reduced motion (native scrolling).
 * `onScroll` receives overall page progress in [0, 1], also once on mount: scroll offset over
 * `scrollEnd()`, clamped. Returns a handle to lock the scroll and to move it to a progress or
 * to the top.
 */
export function useSmoothScroll(
  onScroll: (progress: number) => void,
  { startLocked = false, scrollEnd = pageEnd }: Options = {},
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
    control.setScrollEnd(scrollEnd)
    const report = () => onScroll(control.progress())
    report()
    // The scroll end depends on the viewport height.
    window.addEventListener('resize', report)

    if (reduced) {
      control.attach(null)
      window.addEventListener('scroll', report, { passive: true })
      return () => {
        window.removeEventListener('scroll', report)
        window.removeEventListener('resize', report)
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
      window.removeEventListener('resize', report)
      lenis.destroy()
      control.release()
    }
  }, [reduced, onScroll, control, scrollEnd])

  return control
}
