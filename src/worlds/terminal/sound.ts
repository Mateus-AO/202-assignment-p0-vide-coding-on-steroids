import { defineSound, type SoundCue } from '@/core/sound'
import type { NoiseSpec, ToneSpec } from '@/utils/audio'
import { SHUTDOWN, storyToU } from './beats'
import { LINES, Tone, type Line } from './script'

/** The final line of the table: when it has typed, the mechanics are recovered. */
const isDone = (line: Line) => line.text.startsWith('mechanics recovered:')

/** A line that types characters (blank lines and the bare closing prompt do not). */
const isTyped = (line: Line) => line.span > 0 && line.text.trim().length > 0

/**
 * One tiny soft tick as a line starts typing: a short filtered noise tick with a small
 * high blip under it. Prompt lines are crispest, the hex dump lightest. Every other tick is a
 * touch lower, so a run of them does not sound like a machine gun.
 */
export function tickFor(line: Line, i: number): { noise: NoiseSpec; tone: ToneSpec } {
  const prompt = line.text.startsWith('$')
  const hex = line.to !== undefined
  const strong = line.tone === Tone.BRIGHT
  const level = hex ? 0.55 : prompt ? 1.3 : strong ? 1.1 : 0.85
  const alt = i % 2 === 0 ? 1 : 0.92
  return {
    noise: {
      filter: prompt ? 'highpass' : 'bandpass',
      freq: (prompt ? 3600 : hex ? 2200 : 2800) * alt,
      q: prompt ? 0.8 : 1.4,
      decay: prompt ? 0.03 : 0.022,
      gain: 0.03 * level,
    },
    tone: {
      wave: 'square',
      freq: (prompt ? 1900 : hex ? 1100 : 1450) * alt,
      decay: prompt ? 0.024 : 0.016,
      gain: 0.012 * level,
    },
  }
}

/** A decode scramble chirp: a quick rising warble with a fizz of noise. */
const CHIRP: ToneSpec[] = [
  { wave: 'square', freq: 700, to: 1700, decay: 0.07, gain: 0.03 },
  { wave: 'square', freq: 1000, to: 2300, delay: 0.05, decay: 0.07, gain: 0.022 },
]
const CHIRP_FIZZ: NoiseSpec = {
  filter: 'bandpass',
  freq: 2200,
  to: 5200,
  q: 1.1,
  decay: 0.12,
  gain: 0.03,
}

/** A soft two-note confirmation, rising a fifth. */
const CONFIRM: ToneSpec[] = [
  { wave: 'sine', freq: 880, decay: 0.12, gain: 0.05 },
  { wave: 'sine', freq: 1318.5, delay: 0.09, decay: 0.42, gain: 0.05 },
  { wave: 'triangle', freq: 1760, delay: 0.09, decay: 0.3, gain: 0.012 },
]

/** The CRT turning off: the whine falls from high to very low, a soft thump, a collapse of static. */
const SHUTDOWN_WHINE: ToneSpec = {
  wave: 'sine',
  freq: 5200,
  to: 45,
  decay: 0.8,
  gain: 0.06,
}
const SHUTDOWN_WHINE_2: ToneSpec = {
  wave: 'triangle',
  freq: 2100,
  to: 55,
  decay: 0.7,
  gain: 0.03,
}
const SHUTDOWN_THUMP: ToneSpec = {
  wave: 'sine',
  freq: 95,
  to: 38,
  delay: 0.06,
  attack: 0.006,
  decay: 0.4,
  gain: 0.15,
}
const SHUTDOWN_SPARK: NoiseSpec = {
  filter: 'bandpass',
  freq: 4200,
  to: 250,
  q: 0.9,
  decay: 0.4,
  gain: 0.04,
}
/** The tiny high pip as the last dot goes out. */
const PIP: ToneSpec = { wave: 'sine', freq: 3300, decay: 0.14, gain: 0.04 }

/** The pip sits just before the end of the world, where the last dot disappears. */
export const PIP_AT = SHUTDOWN[1] - 0.01

const typedLines = LINES.filter(isTyped)
const doneLine = LINES.find(isDone) ?? typedLines[typedLines.length - 1]

const tickCues: SoundCue[] = typedLines.map((line, i) => {
  const { noise, tone } = tickFor(line, i)
  return {
    at: storyToU(line.start),
    name: `tick:${LINES.indexOf(line)}`,
    continuous: true,
    play: (v) => {
      v.noise(noise)
      v.tone(tone)
    },
  }
})

const chirpCues: SoundCue[] = LINES.flatMap((line, i): SoundCue[] =>
  line.swapAt === undefined
    ? []
    : [
        {
          at: storyToU(line.swapAt),
          name: `decode:${i}`,
          continuous: true,
          play: (v) => {
            for (const t of CHIRP) v.tone(t)
            v.noise(CHIRP_FIZZ)
          },
        },
      ],
)

export const sound = defineSound({
  // A faint CRT hum (mains hum and its octave) with a very high, thin whine on top.
  bed: {
    layers: [
      {
        source: 'triangle',
        freq: 100,
        filter: { type: 'lowpass', freq: 320 },
        gain: 0.012,
        wobble: { rate: 0.3, depth: 0.25 },
      },
      { source: 'sine', freq: 50, gain: 0.008 },
      { source: 'sine', freq: 8200, gain: 0.0016, wobble: { rate: 0.13, depth: 0.4 } },
    ],
  },
  cues: [
    ...tickCues,
    ...chirpCues,
    {
      at: storyToU(doneLine.start + doneLine.span),
      name: 'recovered',
      play: (v) => {
        for (const t of CONFIRM) v.tone(t)
      },
    },
    {
      at: SHUTDOWN[0],
      name: 'shutdown',
      play: (v) => {
        v.tone(SHUTDOWN_WHINE)
        v.tone(SHUTDOWN_WHINE_2)
        v.tone(SHUTDOWN_THUMP)
        v.noise(SHUTDOWN_SPARK)
      },
    },
    { at: PIP_AT, name: 'shutdown:pip', play: (v) => v.tone(PIP) },
  ],
})
