import { lerp } from '@/utils/math'
import { beats } from './beats'
import { recovered } from './recovered'

/** Screen size in character cells. 48 columns stay readable on a phone. */
export const COLS = 48
export const ROWS = 24

/** How a cell is colored; the numbers are read by the shader. */
export const Tone = { DIM: 1, TEXT: 2, BRIGHT: 3, NOTE: 4, HOT: 5, CURSOR: 6 } as const
export type ToneId = (typeof Tone)[keyof typeof Tone]

/** One line of the session. Starts typing at `start` (progress) and takes `span` to finish. */
export type Line = {
  text: string
  tone: ToneId
  start: number
  span: number
  /** From this column on, the line is drawn in the HOT tone (the value in a table row). */
  valueFrom?: number
  /** The line is rewritten into `to` at `swapAt`, decoding through scrambled characters. */
  to?: string
  swapAt?: number
}

/** The point `f` of the way through a beat. */
const at = (name: keyof typeof beats.ranges, f: number) =>
  lerp(beats.ranges[name][0], beats.ranges[name][1], f)

const note = (text: string, start: number): Line => ({
  text,
  tone: Tone.NOTE,
  start,
  span: 0.02,
})

const HEX: [string, string][] = [
  ['0040  55 89 E5 83 EC 18 D9 45 08 D8 0D 40 2A 41', '0040  fld   dword [ebp+8]'],
  ['0050  D9 5D FC D9 45 FC D9 1D 60 7E 41 00 5D C3', '0050  fstp  dword [ebp-4]'],
  ['0060  55 89 E5 8B 45 08 8B 15 20 5A 41 00 3B C2', '0060  mov   eax, [ebp+8]'],
  ['0070  7C 06 B8 01 00 00 00 5D C3 33 C0 5D C3 90', '0070  jl    0x0078'],
  ['0080  D9 05 78 4B 41 00 D8 4D 08 D9 1D 78 4B 41', '0080  fld   dword [vel_y]'],
  ['0090  8B 45 0C 48 89 45 0C 75 05 E8 B2 FF FF FF', '0090  call  hero_jump'],
]

const row = (label: string, value: number, decimals: number): Line => ({
  text: label.padEnd(20) + value.toFixed(decimals).padStart(4) + ' blocks',
  tone: Tone.TEXT,
  start: 0,
  span: 0.02,
  valueFrom: 20,
})

const table: Line[] = [
  row('run_distance', recovered.runDistance, 1),
  row('pipe_jump_height', recovered.pipeJumpHeight, 1),
  row('pipe_jump_width', recovered.pipeJumpWidth, 1),
  row('block_bump', recovered.blockBump, 2),
  row('coin_rise', recovered.coinRise, 1),
  row('flag_slide', recovered.flagSlide, 1),
].map((line, i) => ({ ...line, start: at('recover', 0.3 + i * 0.07) }))

/** Everything shown, in order. Starts must not decrease. */
export const LINES: Line[] = [
  {
    text: '$ rea open platformer.bin',
    tone: Tone.TEXT,
    start: at('boot', 0.0),
    span: 0.05,
  },
  note('; REA reverse engineers with AI agents.', at('boot', 0.2)),
  note('; no source code, just bytes. let us read them.', at('boot', 0.3)),
  note('; demo bytes: original, made for this page.', at('boot', 0.4)),
  { text: '', tone: Tone.DIM, start: at('boot', 0.5), span: 0 },
  ...HEX.map(([hex, asm], i): Line => ({
    text: hex,
    tone: Tone.DIM,
    start: at('boot', 0.55 + i * 0.07),
    span: 0.02,
    to: asm,
    swapAt: at('decode', 0.1 + i * 0.1),
  })),
  { text: '', tone: Tone.DIM, start: at('decode', 0.6), span: 0 },
  note('; DECOMPS', at('decode', 0.62)),
  note("; a decomp rebuilds a game's source from its", at('decode', 0.66)),
  note('; binary, function by function, until the', at('decode', 0.7)),
  note('; rebuilt code compiles to the same bytes.', at('decode', 0.74)),
  note('; it takes years. most games never get one.', at('decode', 0.78)),
  note(';', at('decode', 0.8)),
  note('; REA', at('decode', 0.82)),
  note('; an MCP server and CLI for AI agents. it', at('decode', 0.84)),
  note('; reads pseudocode, assembly, strings,', at('decode', 0.88)),
  note('; symbols, calls and references.', at('decode', 0.9)),
  note('; every answer ships its evidence and limits.', at('decode', 0.93)),
  note('; analysis runs locally. github.com/morluto/rea', at('decode', 0.97)),
  {
    text: '$ rea recover --mechanics',
    tone: Tone.TEXT,
    start: at('recover', 0.0),
    span: 0.05,
  },
  {
    text: 'MECHANICS RECOVERED',
    tone: Tone.BRIGHT,
    start: at('recover', 0.22),
    span: 0.03,
  },
  ...table,
  {
    text: 'mechanics recovered: 6/6',
    tone: Tone.BRIGHT,
    start: at('recover', 0.8),
    span: 0.04,
  },
  { text: '$ ', tone: Tone.TEXT, start: at('recover', 0.92), span: 0 },
]
