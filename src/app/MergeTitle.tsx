import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { CAPTION_THEMES, CAPTION_THEME_IDS, MERGE_GREEN } from '@/core/captionTheme'
import { fieldProgresses, scramble } from '@/core/reveal'
import { usePrefersReducedMotion } from '@/utils/hooks/usePrefersReducedMotion'
// The brief names the arena's beats file as the contract; the app layer reads only the
// beat's range from it (the arena's index may not re-export it).
// eslint-disable-next-line no-restricted-imports
import { beats as arenaBeats } from '@/worlds/arena/beats'
import {
  MERGE_PART,
  REA_URL,
  SUBTITLE_TEXT,
  TITLE_FIELDS,
  TITLE_PARTS,
  TITLE_TEXT,
  cutParts,
  titleReveal,
  titleSourceValue,
} from './mergeTitle/copy'
import {
  START_LOOK,
  corrupt,
  glitchAt,
  lookIndexAt,
  newGlitchState,
} from './mergeTitle/glitch'
import { getFrame, useAppStore } from './store'
import { worlds } from './worlds'

/**
 * Where the title reads the arena's progress: the progress `u` while the arena is the
 * active world, else -1. The subscription only wakes the title; it never re-renders React.
 */
export type TitleSource = {
  get: () => number
  subscribe: (listener: () => void) => () => void
}

const arenaSource: TitleSource = {
  get: () => {
    const f = getFrame()
    return titleSourceValue(worlds[f.index]?.id === 'arena', f.u)
  },
  subscribe: (listener) => useAppStore.subscribe(() => listener()),
}

const [BEAT_FROM, BEAT_TO] = arenaBeats.ranges.title
/** Longest frame step the title's clock counts, so a stalled tab does not jump the cycle. */
const MAX_DT_MS = 100

/** A pull-request glyph drawn here: two nodes joined by a line, and a branch arrowing in. */
function PullRequestGlyph() {
  return (
    <svg
      className="mt-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
    >
      <circle cx="5.5" cy="5" r="2.7" />
      <circle cx="5.5" cy="19" r="2.7" />
      <path d="M5.5 7.7 V16.3" />
      <circle cx="18.5" cy="19" r="2.7" />
      <path d="M18.5 16.3 V10.5 Q18.5 6 14 6 H10.5" />
      <path d="M13 2.8 L9.6 6 L13 9.2" />
    </svg>
  )
}

/** One drawing of the text. Three are stacked: the main one and two colour-split ghosts. */
function TextLayer({ layer }: { layer: 'main' | 'a' | 'b' }) {
  return (
    <div className={`mt-layer mt-layer-${layer}`} data-mt-layer={layer} aria-hidden>
      <p className="mt-title">
        <span className="mt-face">
          {TITLE_PARTS.map((part, i) =>
            i === MERGE_PART ? (
              <span key={part} className="mt-merge" data-mt-part={i}>
                <span />
                <span className="mt-hid" />
                <PullRequestGlyph />
              </span>
            ) : (
              <span key={part} data-mt-part={i}>
                <span />
                <span className="mt-hid" />
              </span>
            ),
          )}
        </span>
      </p>
    </div>
  )
}

/**
 * The giant "You can merge anything" title over the arena, with a link to REA beneath it.
 * A DOM overlay: hidden until the arena's `title` beat, written by the same scramble the
 * captions use (over the beat, scrubbing both ways), and then it holds. Once visible it
 * glitches every ~2 s on the clock and holds a different world's look (`mergeTitle/glitch`).
 * That clock is the one documented exception to "pure in `u`", limited to this overlay.
 * All updates are imperative DOM writes; React renders the structure once.
 */
export function MergeTitle({ source = arenaSource }: { source?: TitleSource }) {
  const reduced = usePrefersReducedMotion()
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-mt-layer]'))
    // Per layer, per part: [visible text node, hidden text node].
    const nodes = layers.map((layer) =>
      Array.from(layer.querySelectorAll('[data-mt-part]'), (part) => [
        textNode(part.children[0]),
        textNode(part.children[1]),
      ]),
    )
    const sub = el.querySelector<HTMLAnchorElement>('.mt-sub')!
    const subNodes = [textNode(sub.children[0]), textNode(sub.children[1])]
    const style = el.style

    const vis = ['', '', '']
    const hid = ['', '', '']
    const progress = new Float64Array(TITLE_FIELDS.length)
    const g = newGlitchState()

    // Caches: write to the DOM only when something changed.
    let shownOn: boolean | undefined
    let opacity = ''
    let look = -1
    let glitchKey = ''
    let glyphOn: boolean | undefined
    let textKey = ''
    let clock = 0
    let last = -1
    let raf = 0

    const setLook = (index: number) => {
      if (index === look) return
      look = index
      const theme = CAPTION_THEMES[CAPTION_THEME_IDS[index]]
      const c = theme.colors
      style.setProperty('--mt-surface', c.surface)
      style.setProperty('--mt-border', c.border)
      style.setProperty('--mt-text', c.text)
      style.setProperty('--mt-accent', c.accent)
      style.setProperty('--mt-muted', c.muted)
      el.dataset.border = theme.border
      el.dataset.font = theme.font
    }

    const setGlitch = () => {
      const key = g.active ? `${g.cycle}:${g.step}` : ''
      if (key === glitchKey) return
      glitchKey = key
      if (!g.active) {
        el.removeAttribute('data-glitch')
        el.removeAttribute('data-tear')
        return
      }
      el.dataset.glitch = ''
      el.toggleAttribute('data-tear', g.tear)
      style.setProperty('--mt-amount', g.amount.toFixed(2))
      style.setProperty('--mt-shake', g.shake.toFixed(2))
      style.setProperty('--mt-split', String(g.split))
      style.setProperty('--mt-ct', `${(g.clipTop * 100).toFixed(1)}%`)
      style.setProperty('--mt-cb', `${(g.clipBottom * 100).toFixed(1)}%`)
    }

    const writeText = (title: string, subtitle: string, shown: number) => {
      cutParts(title, shown, vis, hid)
      for (const layer of nodes) {
        for (let i = 0; i < layer.length; i++) {
          put(layer[i][0], vis[i])
          put(layer[i][1], hid[i])
        }
      }
      put(subNodes[0], subtitle)
      put(subNodes[1], SUBTITLE_TEXT.slice(subtitle.length))
    }

    const wantsLoop = () => shownOn === true && !reduced && !document.hidden

    const render = () => {
      const u = source.get()
      const p = reduced ? (u >= BEAT_FROM ? 1 : -1) : titleReveal(u, BEAT_FROM, BEAT_TO)
      const on = p >= 0
      if (on !== shownOn) {
        shownOn = on
        el.toggleAttribute('data-on', on)
        // Hidden: out of the tab order and the accessibility tree (CSS visibility).
        if (!on) clock = 0
        if (!on) {
          last = -1
          stopLoop()
        } else startLoop()
      }
      if (!on) return

      const op = reduced ? '1' : Math.min(1, p * 12).toFixed(2)
      if (op !== opacity) {
        opacity = op
        style.opacity = op
      }

      setLook(reduced ? START_LOOK : lookIndexAt(clock))
      if (reduced) g.active = false
      else glitchAt(clock, g)
      setGlitch()

      fieldProgresses(TITLE_FIELDS, p, progress)
      const t = scramble(TITLE_TEXT, progress[0], 11)
      const s = scramble(SUBTITLE_TEXT, progress[1], 29)
      let title = t.done + t.noise
      const shown = title.length
      if (g.active) title = corrupt(title, g.amount, g.cycle, g.step)
      const subtitle = s.done + s.noise
      const key = `${title}|${subtitle}`
      if (key !== textKey) {
        textKey = key
        writeText(title, subtitle, shown)
      }
      const merged = shown >= TITLE_PARTS[0].length + TITLE_PARTS[1].length
      if (merged !== glyphOn) {
        glyphOn = merged
        el.toggleAttribute('data-glyph', merged)
      }
    }

    const tick = (now: number) => {
      raf = 0
      if (last >= 0) clock += Math.min(now - last, MAX_DT_MS)
      last = now
      render()
      if (wantsLoop()) raf = requestAnimationFrame(tick)
    }
    function startLoop() {
      if (raf || !wantsLoop()) return
      last = -1
      raf = requestAnimationFrame(tick)
    }
    function stopLoop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop())

    render()
    const unsubscribe = source.subscribe(render)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      stopLoop()
    }
  }, [source, reduced])

  return (
    <section
      ref={root}
      className="merge-title"
      style={{ '--mt-merge': MERGE_GREEN } as CSSProperties}
    >
      <h2 className="sr-only">{TITLE_TEXT}</h2>
      <div className="mt-panel">
        <div className="mt-stack">
          <TextLayer layer="a" />
          <TextLayer layer="b" />
          <TextLayer layer="main" />
        </div>
        <p className="mt-subtitle">
          <a
            className="mt-sub"
            href={REA_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={SUBTITLE_TEXT}
          >
            <span className="mt-face" />
            <span className="mt-face mt-hid" />
          </a>
        </p>
      </div>
    </section>
  )
}

/** A text node inside `el`, created once so later updates only set `data`. */
function textNode(el: Element | null | undefined): Text {
  return (el!.firstChild as Text | null) ?? el!.appendChild(document.createTextNode(''))
}

/** Sets a text node only when its text changed. */
function put(node: Text, text: string) {
  if (node.data !== text) node.data = text
}
