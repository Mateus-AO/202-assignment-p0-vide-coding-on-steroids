import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'

/**
 * Smooth scrolling driven by the gsap ticker. Disabled for reduced motion.
 * `onScroll` receives overall page progress in [0, 1], also once on mount.
 */
export function useSmoothScroll(onScroll: (progress: number) => void) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const report = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      onScroll(max > 0 ? window.scrollY / max : 0)
    }
    report()

    if (reduced) {
      window.addEventListener('scroll', report, { passive: true })
      return () => window.removeEventListener('scroll', report)
    }

    const lenis = new Lenis()
    lenis.on('scroll', report)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [reduced, onScroll])
}
