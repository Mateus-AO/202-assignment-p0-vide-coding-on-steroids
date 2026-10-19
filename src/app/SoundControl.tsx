import { useEffect, useState } from 'react'
import { SoundToggle } from '@/components/SoundToggle'
import { createAudioEngine, getStorage, readFlag, writeFlag } from '@/utils/audio'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import type { QualityTier } from '@/utils/three/quality'
import { createSoundDirector } from './soundDirector'
import { startOnceRunning } from './soundStart'
import { getFrame, useAppStore } from './store'

const STORAGE_KEY = 'p0-landing:sound'
/** Events browsers accept to start audio. Scrolling is not one of them. */
const GESTURES = ['click', 'keydown', 'touchend'] as const

/**
 * Sound is off until the visitor turns it on. A remembered "on" from an earlier visit still
 * waits for the first click, tap or key before anything plays.
 */
export function SoundControl({ quality }: { quality: QualityTier }) {
  const reduced = usePrefersReducedMotion()
  const [engine] = useState(() => createAudioEngine())
  const [director] = useState(() => createSoundDirector(engine, quality))
  const [on, setOn] = useState(() => readFlag(getStorage(), STORAGE_KEY))

  useEffect(
    () => useAppStore.subscribe((s) => director.update(s.frame, reduced)),
    [director, reduced],
  )

  useEffect(() => {
    let cancelled = false
    // True only once the context is running; a stale start that resolves after sound was
    // turned off is dropped, so it cannot un-mute the toggle.
    const start = () =>
      startOnceRunning(
        engine,
        () => cancelled,
        () => {
          director.reset(getFrame())
          director.update(getFrame(), reduced)
        },
      )
    if (!on) {
      engine.setEnabled(false)
      return () => {
        cancelled = true
      }
    }
    const onGesture = (e: Event) => {
      // The toggle handles its own clicks.
      if (e.target instanceof Element && e.target.closest('[data-sound-toggle]')) return
      begin()
    }
    const remove = () => GESTURES.forEach((g) => window.removeEventListener(g, onGesture))
    // Listeners come off only once the context is running; a refused gesture retries.
    const begin = () => void start().then((started) => started && remove())

    // The toggle's own click has already created the context, but some browsers (Safari) keep
    // it suspended for a moment: wait for it here instead of for another gesture. With a
    // remembered "on" and no gesture yet there is no context, and nothing is created until the
    // first click, tap or key.
    if (engine.unlocked) begin()
    if (!engine.running) GESTURES.forEach((g) => window.addEventListener(g, onGesture))
    return () => {
      cancelled = true
      remove()
    }
  }, [on, engine, director, reduced])

  const toggle = () => {
    const next = !on
    // Must happen inside the click itself, or the browser keeps the context locked.
    if (next) void engine.unlock()
    setOn(next)
    writeFlag(getStorage(), STORAGE_KEY, next)
  }

  return <SoundToggle on={on} onToggle={toggle} />
}
