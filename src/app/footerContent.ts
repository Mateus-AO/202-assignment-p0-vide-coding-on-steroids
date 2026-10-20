/**
 * The footer's copy. Edit the strings here; `Footer.tsx` only lays them out.
 * Keep it short and factual. No hard-coded year (the footer computes it), no author name.
 */
export const FOOTER = {
  kicker: 'END OF THE LINE',
  headline: 'CROSSOVER GAMES GET BUILT, NOT FOUND',
  tagline:
    'Take old mechanics apart, keep what works, and rebuild them together into something new.',

  rea: {
    title: 'REA',
    text: 'An MCP server and CLI for AI agents that recovers mechanics from old binaries. Analysis runs locally.',
    linkLabel: 'REA on GitHub',
    href: 'https://github.com/morluto/rea',
  },

  built: {
    title: 'HOW THIS PAGE IS BUILT',
    stack: [
      'React',
      'Three.js (React Three Fiber and drei)',
      'GSAP',
      'Lenis',
      'Tailwind',
      'Zustand',
      'Vite',
      'TypeScript',
    ],
    text: 'Every texture, character and sound is drawn or synthesized in code.',
  },

  notice: {
    title: 'NOTICES',
    original:
      'All art, sound and text on this page are original. No game owner is affiliated with or endorses this page; any resemblance is a tribute.',
    mascot:
      'The pixel picture on the TV wall is a hand-drawn rendition of the Claude Code mascot, made from scratch in code. It implies no endorsement by Anthropic.',
    sound: 'Sound is off by default. Use the toggle at the top right.',
  },

  backToTop: 'BACK TO TOP',
} as const

/** "© 2026": the year comes from the clock, never from the source. */
export function copyrightLine(now: Date = new Date()) {
  return `© ${now.getFullYear()}`
}

/** The stack as one readable list: "A, B and C". */
export function stackList(items: readonly string[]) {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
