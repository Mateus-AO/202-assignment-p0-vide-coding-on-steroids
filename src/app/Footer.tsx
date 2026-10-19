import { useStarterStore } from '@/worlds/starter'
import type { SmoothScroll } from '@/utils/scroll/useSmoothScroll'
import { copyrightLine, FOOTER, stackList } from './footerContent'

const HEADING = 'font-pixel text-[11px] leading-5 text-[#ffd84d]'
const BODY = 'font-mono text-sm leading-6 text-[#d4d4e0]'

/**
 * The page's footer: a solid black panel after the scroll space, so the worlds' progress is
 * already at 1 when it scrolls into view (see the `scrollEnd` option of `useSmoothScroll`).
 * It sits above the captions (z-10) and below the sound toggle (z-20). Copy: `footerContent.ts`.
 * It is inert until Play has been pressed, so keyboard focus cannot skip the loading screen.
 */
export function Footer({ scroll }: { scroll: SmoothScroll }) {
  const played = useStarterStore((s) => s.played)

  return (
    <footer
      inert={!played}
      className="relative z-[15] border-t-4 border-dashed border-[#3a3a4c] bg-black px-4 pt-20 pb-10 sm:px-8 sm:pt-24"
      style={{
        // A faint, static scanline texture: the page's CRT look without any motion.
        backgroundImage:
          'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.025) 0 1px, transparent 1px 3px)',
      }}
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-pixel text-[10px] leading-4 text-[#a8a8c0]">{FOOTER.kicker}</p>
        <h2 className="font-pixel mt-3 text-base leading-7 text-[#ffd84d] [overflow-wrap:anywhere] sm:text-xl sm:leading-9">
          {FOOTER.headline}
        </h2>
        <p className={`${BODY} mt-4 max-w-2xl text-base leading-7 text-[#f2f2f7]`}>
          {FOOTER.tagline}
        </p>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          <section aria-labelledby="footer-rea">
            <h3 id="footer-rea" className={HEADING}>
              {FOOTER.rea.title}
            </h3>
            <p className={`${BODY} mt-3`}>{FOOTER.rea.text}</p>
            <a
              href={FOOTER.rea.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-mono text-sm leading-6 font-bold text-[#ffd84d] underline decoration-2 underline-offset-4 [overflow-wrap:anywhere] hover:bg-[#ffd84d] hover:text-black focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {FOOTER.rea.linkLabel}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="mt-1 font-mono text-xs leading-5 text-[#a8a8c0] [overflow-wrap:anywhere]">
              {FOOTER.rea.href}
            </p>
          </section>

          <section aria-labelledby="footer-built">
            <h3 id="footer-built" className={HEADING}>
              {FOOTER.built.title}
            </h3>
            <p className={`${BODY} mt-3`}>
              {stackList(FOOTER.built.stack)}. {FOOTER.built.text}
            </p>
          </section>

          <section aria-labelledby="footer-notice">
            <h3 id="footer-notice" className={HEADING}>
              {FOOTER.notice.title}
            </h3>
            <p className={`${BODY} mt-3`}>{FOOTER.notice.original}</p>
            <p className={`${BODY} mt-3`}>{FOOTER.notice.mascot}</p>
            <p className={`${BODY} mt-3`}>{FOOTER.notice.sound}</p>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t-2 border-dashed border-[#3a3a4c] pt-6">
          <p className="font-mono text-sm text-[#a8a8c0]">{copyrightLine()}</p>
          <button
            type="button"
            onClick={scroll.scrollToTop}
            className="pixel-button min-h-12 px-5"
          >
            {FOOTER.backToTop}
          </button>
        </div>
      </div>
    </footer>
  )
}
