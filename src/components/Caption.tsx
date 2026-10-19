import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import type { Caption as CaptionData } from '@/core/world'

const SECONDS_PER_LETTER = 0.03

/** Pixel dialog box with a letter-by-letter reveal. Look is set by `--caption-*` tokens. */
export function Caption({ caption }: { caption: CaptionData }) {
  const reduced = usePrefersReducedMotion()
  const shown = useRef<HTMLSpanElement>(null)
  const hidden = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(reduced)
  const { text } = caption

  // The not-yet-typed rest is rendered invisible, so the box never changes size while typing.
  useLayoutEffect(() => {
    if (reduced) return
    const counter = { n: 0 }
    const tween = gsap.to(counter, {
      n: text.length,
      duration: text.length * SECONDS_PER_LETTER,
      ease: 'none',
      onUpdate: () => {
        const n = Math.floor(counter.n)
        if (shown.current) shown.current.textContent = text.slice(0, n)
        if (hidden.current) hidden.current.textContent = text.slice(n)
      },
      onComplete: () => setDone(true),
    })
    return () => {
      tween.kill()
    }
  }, [text, reduced])

  return (
    <div className="pixel-box" aria-label={text}>
      <p aria-hidden>
        <span ref={shown}>{reduced ? text : ''}</span>
        <span ref={hidden} className="invisible">
          {reduced ? '' : text}
        </span>
      </p>
      {caption.link && (
        <a
          href={caption.link.href}
          target="_blank"
          rel="noreferrer"
          className={`pixel-link pointer-events-auto mt-4 inline-block ${done ? '' : 'invisible'}`}
        >
          {caption.link.label}
        </a>
      )}
    </div>
  )
}
