import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { TV_COUNT } from './layout'
import {
  BLOCK,
  CELL_BYTES,
  COLS_TV,
  phosphorOf,
  ROWS_TV,
  SESSIONS,
  SWAP_SPAN,
  Tone,
  TV_BYTES,
  tvScreen,
} from './script'
import { SPECS } from './specs'

const render = (index: number, u: number) => {
  const out = new Uint8Array(TV_BYTES)
  tvScreen(index, u, out)
  return out
}

function rowText(buffer: Uint8Array, row: number) {
  let text = ''
  for (let c = 0; c < COLS_TV; c++) {
    const code = buffer[(row * COLS_TV + c) * CELL_BYTES]
    text += code ? String.fromCharCode(code) : ' '
  }
  return text.trimEnd()
}

const screenText = (buffer: Uint8Array) =>
  Array.from({ length: ROWS_TV }, (_, r) => rowText(buffer, r))

const filledRows = (buffer: Uint8Array) =>
  screenText(buffer).filter((line) => line.length > 0).length

const tvs = Array.from({ length: TV_COUNT }, (_, i) => i)

describe('the sessions', () => {
  it('has one per TV, with made-up names and no real titles', () => {
    expect(SESSIONS).toHaveLength(TV_COUNT)
    expect(SPECS).toHaveLength(TV_COUNT)
    expect(new Set(SPECS.map((s) => s.bin)).size).toBe(TV_COUNT)
    const all = SPECS.flatMap((s) => [s.bin, ...s.notes, ...s.asm, ...s.code, ...s.tail])
      .join('\n')
      .toLowerCase()
    for (const banned of [
      'mario',
      'zelda',
      'pac',
      'tetris',
      'doom',
      'sonic',
      'minecraft',
    ]) {
      expect(all).not.toContain(banned)
    }
  })

  it('fits 28 columns and uses only printable ASCII', () => {
    for (const session of SESSIONS) {
      for (const line of session) {
        for (const text of [line.text, line.to]) {
          expect(text.length).toBeLessThanOrEqual(COLS_TV)
          expect(text).toMatch(/^[\x20-\x7e]*$/)
        }
      }
    }
  })

  it('is in order and stays inside the page', () => {
    for (const session of SESSIONS) {
      session.forEach((line, i) => {
        expect(line.start).toBeGreaterThanOrEqual(0)
        expect(line.start + line.span).toBeLessThanOrEqual(1)
        if (i > 0) expect(line.start).toBeGreaterThanOrEqual(session[i - 1].start)
        if (Number.isFinite(line.swapAt)) {
          expect(line.swapAt).toBeGreaterThanOrEqual(line.start + line.span)
          expect(line.swapAt + SWAP_SPAN).toBeLessThanOrEqual(1)
        }
      })
    }
  })

  it('comes alive around the middle of the warm-up, staggered', () => {
    const [from, to] = beats.ranges.warm
    const starts = SESSIONS.map((s) => s[0].start)
    for (const start of starts) {
      expect(start).toBeGreaterThan(from + (to - from) * 0.15)
      expect(start).toBeLessThan(to - (to - from) * 0.1)
    }
    expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThan(0.03)
    expect(new Set(starts.map((s) => s.toFixed(4))).size).toBe(TV_COUNT)
  })

  it('rewrites hex into assembly, then shows pseudocode with named functions', () => {
    for (const session of SESSIONS) {
      const hex = session.filter((l) => Number.isFinite(l.swapAt))
      expect(hex.length).toBeGreaterThanOrEqual(4)
      for (const line of hex) {
        expect(line.text).toMatch(/^[0-9a-f]{4}( [0-9A-F]{2}){8}$/)
        expect(line.to).toMatch(/^[0-9a-f]{4} [a-z]/)
      }
      expect(session.some((l) => /^void [a-z_]+\(/.test(l.text))).toBe(true)
      expect(session.some((l) => l.tone === Tone.NOTE && l.text.startsWith(';'))).toBe(
        true,
      )
    }
  })

  it('ends its main session by the end of decode and trickles on afterwards', () => {
    for (const session of SESSIONS) {
      const late = session.filter((l) => l.start > beats.ranges.assemble[0])
      expect(late.length).toBeGreaterThanOrEqual(3)
      const before = session.filter((l) => l.start <= beats.ranges.decode[1])
      expect(before.length).toBeGreaterThan(15)
    }
  })
})

describe('tvScreen', () => {
  it('is blank before the warm-up begins, and until its session starts', () => {
    for (const i of tvs) {
      for (const u of [0, 0.05, beats.ranges.warm[0]]) {
        expect(render(i, u).every((v) => v === 0)).toBe(true)
      }
      expect(render(i, SESSIONS[i][0].start - 0.001).every((v) => v === 0)).toBe(true)
      expect(render(i, SESSIONS[i][0].start + 0.0001).some((v) => v !== 0)).toBe(true)
    }
  })

  it('is a pure function of the index and progress', () => {
    for (const i of tvs) {
      for (const u of [0.15, 0.3, 0.5, 0.7, 1]) {
        expect(render(i, u)).toEqual(render(i, u))
      }
    }
  })

  it('does not depend on what was in the buffer', () => {
    const dirty = new Uint8Array(TV_BYTES).fill(77)
    tvScreen(3, 0.4, dirty)
    expect(dirty).toEqual(render(3, 0.4))
  })

  it('scrubs: going back reproduces the earlier screen exactly', () => {
    const early = render(2, 0.33)
    render(2, 0.9)
    expect(render(2, 0.33)).toEqual(early)
  })

  it('is well filled by the end of decode, at every TV', () => {
    for (const i of tvs) {
      expect(filledRows(render(i, beats.ranges.decode[1]))).toBeGreaterThanOrEqual(10)
    }
  })

  it('keeps the screens living through assemble and finish', () => {
    for (const i of tvs) {
      expect(filledRows(render(i, 0.8))).toBeGreaterThanOrEqual(10)
      expect(render(i, 0.6)).not.toEqual(render(i, 0.95))
    }
  })

  it('writes the whole screen of a TV in the shape the scene expects', () => {
    for (const i of tvs) {
      const buffer = render(i, 0.5)
      for (let c = 0; c < COLS_TV * ROWS_TV; c++) {
        const code = buffer[c * CELL_BYTES]
        expect(code === 0 || (code >= 32 && code <= 126) || code === BLOCK).toBe(true)
        const tone = buffer[c * CELL_BYTES + 1]
        if (code === 0) expect(tone).toBe(0)
        else expect(tone).toBeGreaterThanOrEqual(Tone.DIM)
        expect(buffer[c * CELL_BYTES + 2]).toBe(0)
        expect(buffer[c * CELL_BYTES + 3]).toBe(0)
      }
    }
  })

  it('shows at most one block cursor, after the last started line', () => {
    let withCursor = 0
    let total = 0
    for (const i of tvs) {
      for (const u of [0.2, 0.4, 0.55, 0.75, 1]) {
        const buffer = render(i, u)
        let cursors = 0
        for (let c = 0; c < COLS_TV * ROWS_TV; c++) {
          if (buffer[c * CELL_BYTES + 1] === Tone.CURSOR) {
            expect(buffer[c * CELL_BYTES]).toBe(BLOCK)
            cursors++
          }
        }
        expect(cursors).toBeLessThanOrEqual(1)
        withCursor += cursors
        total++
      }
    }
    // A line that fills all 28 columns has no room for it, so it is missing now and then.
    expect(withCursor / total).toBeGreaterThan(0.85)
  })

  it('scrolls once the session outgrows the screen', () => {
    const lines = screenText(render(0, 0.55))
    expect(lines.some((l) => l.startsWith('$ rea open'))).toBe(false)
  })

  it('types the prompt out character by character', () => {
    const [first] = SESSIONS[0]
    const half = render(0, first.start + first.span / 2)
    expect(rowText(half, 0).length).toBeGreaterThan(1)
    expect(rowText(half, 0).length).toBeLessThan(first.text.length)
    expect(rowText(render(0, first.start + first.span + 0.001), 0)).toContain(first.text)
  })

  it('decodes a hex line into assembly through scrambled glyphs', () => {
    for (const i of [0, 4, 8]) {
      const session = SESSIONS[i]
      const line = session.find((l) => Number.isFinite(l.swapAt))!
      const row = session.indexOf(line)
      const before = rowText(render(i, line.swapAt - 0.0005), row)
      const during = rowText(render(i, line.swapAt + SWAP_SPAN / 2), row)
      const after = rowText(render(i, line.swapAt + SWAP_SPAN + 0.0005), row)
      expect(before).toBe(line.text)
      expect(after).toBe(line.to)
      expect(during).not.toBe(before)
      expect(during).not.toBe(after)
    }
  })

  it('differs from one TV to the next, at the same progress', () => {
    for (const u of [0.3, 0.45, 0.55, 0.9]) {
      const texts = tvs.map((i) => screenText(render(i, u)).join('\n'))
      expect(new Set(texts).size).toBe(TV_COUNT)
    }
  })

  it('never looks synchronized: the wall is mid-way through different lines', () => {
    for (const u of [0.38, 0.42, 0.46]) {
      const lastLine = tvs.map((i) => SESSIONS[i].filter((l) => l.start <= u).length)
      expect(new Set(lastLine).size, `at ${u}`).toBeGreaterThan(4)
    }
  })

  it('colors assignment values differently from their names', () => {
    const buffer = render(0, 0.55)
    const row = screenText(buffer).findIndex((l) => l.includes('vel_y = 4.2f;'))
    expect(row).toBeGreaterThanOrEqual(0)
    const text = rowText(buffer, row)
    const at = text.indexOf('4.2f')
    expect(buffer[(row * COLS_TV + text.indexOf('vel_y')) * CELL_BYTES + 1]).toBe(
      Tone.TEXT,
    )
    expect(buffer[(row * COLS_TV + at) * CELL_BYTES + 1]).toBe(Tone.HOT)
  })

  it('does not throw for a bad index or progress, and clamps them', () => {
    const out = new Uint8Array(TV_BYTES)
    for (const i of [-1, -100, 9, 100, 3.7, NaN, Infinity, -Infinity]) {
      for (const u of [-5, -0.1, 0, 0.5, 1, 1.5, 99, NaN, Infinity, -Infinity]) {
        expect(() => tvScreen(i, u, out)).not.toThrow()
      }
    }
    expect(render(-3, 0.5)).toEqual(render(0, 0.5))
    expect(render(40, 0.5)).toEqual(render(TV_COUNT - 1, 0.5))
    expect(render(3.9, 0.5)).toEqual(render(3, 0.5))
    expect(render(2, 7)).toEqual(render(2, 1))
    expect(render(2, -7).every((v) => v === 0)).toBe(true)
    expect(render(2, NaN).every((v) => v === 0)).toBe(true)
  })

  it('respects the buffer size: writes only TV_BYTES, and too small a buffer is safe', () => {
    const big = new Uint8Array(TV_BYTES + 16).fill(9)
    tvScreen(1, 0.5, big)
    expect(big.slice(TV_BYTES).every((v) => v === 9)).toBe(true)
    const small = new Uint8Array(40)
    expect(() => tvScreen(1, 0.5, small)).not.toThrow()
  })
})

describe('phosphorOf', () => {
  it('gives nine distinct, bright-enough colors in 0 to 1', () => {
    const colors = tvs.map((i) => phosphorOf(i))
    for (const color of colors) {
      expect(color).toHaveLength(3)
      for (const v of color) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
      // Readable on black: bright enough.
      expect(0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]).toBeGreaterThan(
        0.45,
      )
    }
    for (let a = 0; a < colors.length; a++) {
      for (let b = a + 1; b < colors.length; b++) {
        const dist = Math.hypot(
          colors[a][0] - colors[b][0],
          colors[a][1] - colors[b][1],
          colors[a][2] - colors[b][2],
        )
        expect(dist, `${a} and ${b}`).toBeGreaterThan(0.12)
      }
    }
  })

  it('clamps a bad index', () => {
    expect(phosphorOf(-4)).toEqual(phosphorOf(0))
    expect(phosphorOf(99)).toEqual(phosphorOf(TV_COUNT - 1))
    expect(phosphorOf(NaN)).toEqual(phosphorOf(0))
  })
})
