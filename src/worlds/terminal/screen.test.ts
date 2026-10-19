import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import { recovered } from './recovered'
import { BLOCK, CELL_BYTES, renderScreen, SCREEN_BYTES, SCRAMBLE_SPAN } from './screen'
import { COLS, LINES, ROWS, Tone } from './script'
import { damp, MAX_TILT, tiltTarget, type Tilt } from './tilt'

const render = (u: number) => {
  const out = new Uint8Array(SCREEN_BYTES)
  renderScreen(u, out)
  return out
}

/** The text of one row; empty cells show as spaces. */
function rowText(buffer: Uint8Array, row: number) {
  let text = ''
  for (let c = 0; c < COLS; c++) {
    const code = buffer[(row * COLS + c) * CELL_BYTES]
    text += code ? String.fromCharCode(code) : ' '
  }
  return text.trimEnd()
}

const screenText = (buffer: Uint8Array) =>
  Array.from({ length: ROWS }, (_, r) => rowText(buffer, r))

describe('the script', () => {
  it('fits the screen and uses only printable ASCII', () => {
    for (const line of LINES) {
      for (const text of [line.text, line.to ?? '']) {
        expect(text.length).toBeLessThanOrEqual(COLS)
        expect(text).toMatch(/^[\x20-\x7e]*$/)
      }
    }
  })

  it('is in order and stays inside the page', () => {
    LINES.forEach((line, i) => {
      expect(line.start).toBeGreaterThanOrEqual(0)
      expect(line.start + line.span).toBeLessThanOrEqual(1)
      if (i > 0) expect(line.start).toBeGreaterThanOrEqual(LINES[i - 1].start)
      if (line.swapAt !== undefined) {
        expect(line.swapAt).toBeGreaterThanOrEqual(line.start + line.span)
        expect(line.swapAt + SCRAMBLE_SPAN).toBeLessThanOrEqual(1)
      }
    })
  })

  it('does not start before the black has lifted', () => {
    expect(LINES[0].start).toBeGreaterThanOrEqual(beats.ranges.rise[1] - 0.05)
  })
})

describe('renderScreen', () => {
  it('is blank at the start', () => {
    expect(render(0).every((v) => v === 0)).toBe(true)
  })

  it('is a pure function of progress', () => {
    for (const u of [0.1, 0.4, 0.55, 0.9, 1]) {
      expect(render(u)).toEqual(render(u))
    }
  })

  it('types the prompt out character by character', () => {
    const [first] = LINES
    const half = first.start + first.span / 2
    expect(rowText(render(half), 0).length).toBeGreaterThan(1)
    expect(rowText(render(half), 0).length).toBeLessThan(first.text.length)
    expect(rowText(render(first.start + first.span + 0.001), 0)).toContain(first.text)
  })

  it('shows a block cursor after the last typed character', () => {
    const u = 0.5
    const buffer = render(u)
    const cursors: number[] = []
    for (let i = 0; i < buffer.length; i += CELL_BYTES) {
      if (buffer[i + 1] === Tone.CURSOR) {
        expect(buffer[i]).toBe(BLOCK)
        cursors.push(i)
      }
    }
    expect(cursors).toHaveLength(1)
  })

  it('decodes a hex line into assembly through scrambled characters', () => {
    const line = LINES.find((l) => l.to !== undefined && l.swapAt !== undefined)!
    const row = LINES.indexOf(line)
    const before = rowText(render(line.swapAt! - 0.001), row)
    const during = rowText(render(line.swapAt! + SCRAMBLE_SPAN / 2), row)
    const after = rowText(render(line.swapAt! + SCRAMBLE_SPAN + 0.001), row)
    expect(before).toBe(line.text)
    expect(after).toBe(line.to)
    expect(during).not.toBe(before)
    expect(during).not.toBe(after)
  })

  it('scrolls up once the session outgrows the screen', () => {
    const lines = screenText(render(1))
    expect(lines.some((l) => l.startsWith('0040'))).toBe(false)
    expect(lines.at(-1)).toBe('$ ' + String.fromCharCode(BLOCK))
  })

  it('ends with every recovered mechanic and the summary', () => {
    const text = screenText(render(1)).join('\n')
    expect(text).toContain('mechanics recovered: 6/6')
    for (const name of [
      'run_distance',
      'pipe_jump_height',
      'pipe_jump_width',
      'block_bump',
      'coin_rise',
      'flag_slide',
    ]) {
      expect(text).toContain(name)
    }
    expect(text).toContain(`${recovered.pipeJumpHeight.toFixed(1)} blocks`)
    expect(text).toContain(`${recovered.blockBump.toFixed(2)} blocks`)
  })

  it('explains decomps and REA in comments', () => {
    const all = LINES.map((l) => l.text).join('\n')
    expect(all).toMatch(/DECOMPS/)
    expect(all).toMatch(/REA/)
    expect(all).toContain('github.com/morluto/rea')
  })

  it('colors the table values differently from their names', () => {
    const buffer = render(1)
    const r = screenText(buffer).findIndex((l) => l.startsWith('block_bump'))
    expect(buffer[(r * COLS + 2) * CELL_BYTES + 1]).toBe(Tone.TEXT)
    expect(buffer[(r * COLS + 22) * CELL_BYTES + 1]).toBe(Tone.HOT)
  })
})

describe('tilt', () => {
  const out = (): Tilt => ({ pitch: 0, yaw: 0 })

  it('turns away from the pointer', () => {
    const right = tiltTarget({ x: 1, y: 0 }, 0, false, out())
    const left = tiltTarget({ x: -1, y: 0 }, 0, false, out())
    expect(right.yaw).toBeCloseTo(-MAX_TILT)
    expect(left.yaw).toBeCloseTo(MAX_TILT)
    expect(tiltTarget({ x: 0, y: 1 }, 0, false, out()).pitch).toBeCloseTo(MAX_TILT)
    expect(tiltTarget({ x: 0, y: -1 }, 0, false, out()).pitch).toBeCloseTo(-MAX_TILT)
  })

  it('never turns past the limit, even for a wild pointer', () => {
    const t = tiltTarget({ x: 9, y: -9 }, 0, false, out())
    expect(Math.abs(t.yaw)).toBeLessThanOrEqual(MAX_TILT)
    expect(Math.abs(t.pitch)).toBeLessThanOrEqual(MAX_TILT)
  })

  it('sways with progress when there is no pointer, within the limit', () => {
    for (let u = 0; u <= 1; u += 0.05) {
      const t = tiltTarget(null, u, false, out())
      expect(Math.abs(t.yaw)).toBeLessThanOrEqual(MAX_TILT)
      expect(Math.abs(t.pitch)).toBeLessThanOrEqual(MAX_TILT)
    }
    expect(tiltTarget(null, 0.3, false, out())).not.toEqual(
      tiltTarget(null, 0.6, false, out()),
    )
  })

  it('holds still with reduced motion, pointer or not', () => {
    expect(tiltTarget({ x: 1, y: 1 }, 0.3, true, out())).toEqual({ pitch: 0, yaw: 0 })
    expect(tiltTarget(null, 0.3, true, out())).toEqual({ pitch: 0, yaw: 0 })
  })

  it('eases toward the target at any frame rate', () => {
    expect(damp(0, 1, 0, 8)).toBe(0)
    expect(damp(0, 1, 10, 8)).toBeCloseTo(1)
    const twoSteps = damp(damp(0, 1, 1 / 60, 8), 1, 1 / 60, 8)
    expect(twoSteps).toBeCloseTo(damp(0, 1, 2 / 60, 8))
  })
})
