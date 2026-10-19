import { useLayoutEffect, useMemo, useRef } from 'react'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
import type { Caption as CaptionData } from '@/core/caption'
import {
  captionFields,
  fieldProgresses,
  revealProgress,
  scramble,
  statProgress,
  statValue,
  scrambled,
  type FieldKey,
} from '@/core/reveal'

/** Where the caption reads the world's progress from: a current value and change updates. */
export type ProgressSource = {
  get: () => number
  subscribe: (listener: () => void) => () => void
}

/** A text node inside `el`, created once so later updates only set `data`. */
function textNode(el: Element | null | undefined): Text | null {
  if (!el) return null
  return (el.firstChild as Text | null) ?? el.appendChild(document.createTextNode(''))
}

/** Sets a text node only when its text changed (most scroll events leave it as is). */
function put(node: Text | null, text: string) {
  if (node && node.data !== text) node.data = text
}

/** The four pieces of one revealed line: written, noise, cursor, not yet written. */
function Line({ field, text, still }: { field: FieldKey; text: string; still: boolean }) {
  return (
    <p className={`caption-${field}`} data-line={field}>
      <span>{still ? text : null}</span>
      <span />
      <span className="caption-cursor" />
      <span className="caption-rest">{still ? null : text}</span>
    </p>
  )
}

/** Text in a slot sized by its final text (stats), so counting never moves anything. */
function Slot({
  className,
  text,
  live,
}: {
  className: string
  text: string
  live: boolean
}) {
  return (
    <span className={`caption-slot ${className}`}>
      <span className="caption-ghost">{text}</span>
      <span className="caption-live" data-live={live ? '' : undefined}>
        {live ? null : text}
      </span>
    </span>
  )
}

/**
 * Pixel dialog box. Its text is written as the world's progress moves through the caption's
 * range (see `core/reveal`): the DOM is updated imperatively on each scroll update, never
 * through React state, and the box is laid out at its final size from the start. Under
 * reduced motion the final text just fades in. Look is set by the `--caption-*` tokens.
 */
export function Caption({
  caption,
  source,
}: {
  caption: CaptionData
  source: ProgressSource
}) {
  const reduced = usePrefersReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const still = reduced
  const fields = useMemo(() => captionFields(caption), [caption])
  const spoken = [
    caption.kicker,
    caption.headline,
    caption.body,
    caption.stats?.map((s) => `${s.label} ${s.value}`).join(', '),
    caption.footnote,
  ]
    .filter(Boolean)
    .join('. ')

  useLayoutEffect(() => {
    const root = box.current
    if (!root || reduced) return
    const lines = new Map<string, Text[]>()
    root.querySelectorAll('[data-line]').forEach((el) => {
      lines.set(
        el.getAttribute('data-line')!,
        Array.from(el.children, (c) => textNode(c)!),
      )
    })
    const live = Array.from(root.querySelectorAll('[data-live]'), (el) => textNode(el))
    const link = root.querySelector<HTMLElement>('.caption-link')
    const progress = new Float64Array(fields.length)
    const seed = Math.floor(caption.from * 1000)
    const texts: Record<string, string | undefined> = {
      kicker: caption.kicker,
      headline: caption.headline,
      body: caption.body,
      footnote: caption.footnote,
    }
    let ready: boolean | undefined

    const draw = () => {
      const p = revealProgress(caption, source.get())
      fieldProgresses(fields, p, progress)
      fields.forEach((f, i) => {
        if (f.key === 'stats') {
          const stats = caption.stats!
          stats.forEach((s, k) => {
            const sp = progress[i] < 0 ? -1 : statProgress(progress[i], k, stats.length)
            put(
              live[2 * k],
              sp < 0 ? '' : scrambled(s.label, Math.min(1, sp * 2), seed + k),
            )
            put(live[2 * k + 1], statValue(s.value, sp, seed + k))
          })
          return
        }
        const nodes = lines.get(f.key)
        if (!nodes) return
        const r = scramble(texts[f.key]!, progress[i], seed + i)
        put(nodes[0], r.done)
        put(nodes[1], r.noise)
        put(nodes[2], r.cursor)
        put(nodes[3], r.rest)
      })
      const done = p >= 1
      if (link && done !== ready) {
        ready = done
        link.toggleAttribute('data-ready', done)
      }
    }

    draw()
    return source.subscribe(draw)
  }, [caption, source, reduced, fields])

  return (
    <div
      ref={box}
      className={`pixel-box caption-box ${still ? 'caption-fade' : ''}`}
      role="group"
      aria-label={spoken}
    >
      <div aria-hidden>
        {caption.kicker && <Line field="kicker" text={caption.kicker} still={still} />}
        {caption.headline && (
          <Line field="headline" text={caption.headline} still={still} />
        )}
        {caption.body && <Line field="body" text={caption.body} still={still} />}
        {caption.stats && caption.stats.length > 0 && (
          <dl className="caption-stats">
            {caption.stats.map((s) => (
              <div key={s.label} className="caption-stat">
                <dt>
                  <Slot className="" text={s.label} live={!still} />
                </dt>
                <dd>
                  <Slot className="" text={s.value} live={!still} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {caption.footnote && (
          <Line field="footnote" text={caption.footnote} still={still} />
        )}
      </div>
      {caption.link && (
        <a
          href={caption.link.href}
          target="_blank"
          rel="noreferrer"
          className="caption-link pixel-link pointer-events-auto"
          data-ready={still ? '' : undefined}
        >
          {caption.link.label}
        </a>
      )}
    </div>
  )
}
