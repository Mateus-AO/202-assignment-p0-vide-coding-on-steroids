/** One label/value pair in a caption's stats row, e.g. { label: 'year', value: '1972' }. */
export type CaptionStat = { label: string; value: string }

/** A world shows at most this many stats; more would not fit a phone. */
export const MAX_CAPTION_STATS = 4

/**
 * What a world says over a range of its progress. Every field except the range is optional;
 * an entry needs at least one of kicker, headline, body, stats, footnote.
 * Copy lives in each world's `captions.ts`, never in scene code.
 */
export type Caption = {
  /** Local progress range [from, to) in which the caption is shown. */
  from: number
  to: number
  /** Small line above the headline, e.g. "STAGE 01 / 1972". */
  kicker?: string
  headline?: string
  body?: string
  /** Up to MAX_CAPTION_STATS pairs, shown as a compact row. */
  stats?: CaptionStat[]
  footnote?: string
  link?: { href: string; label: string }
  /**
   * Shown complete from `from`, with no reveal. For the page's opening caption, so the page
   * never loads blank.
   */
  settled?: boolean
}

/** The text a caption is known by in errors and as a React key. */
export function captionLabel(c: Caption): string {
  return c.headline ?? c.body ?? c.kicker ?? c.footnote ?? `${c.from}-${c.to}`
}

/** Returns a problem description, or undefined when the caption is well-formed. */
export function captionProblem(c: Caption): string | undefined {
  if (!(c.from >= 0 && c.from < c.to && c.to <= 1)) return 'bad caption range'
  if (!(c.kicker || c.headline || c.body || c.footnote || c.stats?.length))
    return 'caption has no content'
  if (c.stats && c.stats.length > MAX_CAPTION_STATS)
    return `more than ${MAX_CAPTION_STATS} stats`
  if (c.stats?.some((s) => !s.label || !s.value))
    return 'a stat needs a label and a value'
  return undefined
}
