import { describe, expect, it } from 'vitest'
import { SLOTS } from './layout'
import { EYE, GLOW, PALETTE, PIC_H, PIC_W, renderPicture, type Look } from './picture'

const CENTER: Look = { x: 0, y: 0 }

const draw = (look: Look = CENTER, blink = 0) => {
  const out = new Uint8Array(PIC_W * PIC_H)
  renderPicture(out, look, blink)
  return out
}

/** A pixel counts as seen when its center lies behind some set's glass. */
const seen = (x: number, y: number) =>
  SLOTS.some(
    ({ rect: r }) =>
      x + 0.5 >= r.x0 && x + 0.5 <= r.x1 && y + 0.5 >= r.y0 && y + 0.5 <= r.y1,
  )

/** Every pixel of one palette index, as [x, y]. */
function pixelsOf(buffer: Uint8Array, index: number) {
  const found: [number, number][] = []
  for (let i = 0; i < PIC_W * PIC_H; i++) {
    if (buffer[i] === index) found.push([i % PIC_W, Math.floor(i / PIC_W)])
  }
  return found
}

/** The eye pixels split into the two eyes, left and right of the figure's middle. */
function eyes(buffer: Uint8Array) {
  const all = pixelsOf(buffer, EYE)
  return {
    all,
    left: all.filter(([x]) => x < PIC_W / 2),
    right: all.filter(([x]) => x >= PIC_W / 2),
  }
}

describe('PALETTE', () => {
  it('is small, starts with black and holds valid colors', () => {
    expect(PALETTE.length).toBeLessThanOrEqual(8)
    expect(PALETTE[0]).toEqual([0, 0, 0])
    for (const color of PALETTE) {
      for (const v of color) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(255)
      }
    }
  })

  it('has an orange body near the terracotta the mascot is drawn in', () => {
    const [r, g, b] = PALETTE[1]
    expect(r).toBeGreaterThan(190)
    expect(g).toBeGreaterThan(90)
    expect(g).toBeLessThan(150)
    expect(b).toBeLessThan(110)
  })
})

describe('renderPicture', () => {
  it('only writes palette indices', () => {
    for (const blink of [0, 0.5, 1]) {
      for (const v of draw({ x: 1, y: -1 }, blink)) expect(v).toBeLessThan(PALETTE.length)
    }
  })

  it('is a pure function of its inputs', () => {
    expect(draw({ x: 0.3, y: -0.7 }, 0.5)).toEqual(draw({ x: 0.3, y: -0.7 }, 0.5))
  })

  it('writes exactly PIC_W * PIC_H bytes and leaves the rest alone', () => {
    const out = new Uint8Array(PIC_W * PIC_H + 8).fill(200)
    renderPicture(out, CENTER, 0)
    expect(out.slice(PIC_W * PIC_H).every((v) => v === 200)).toBe(true)
    expect(out.slice(0, PIC_W * PIC_H).every((v) => v < PALETTE.length)).toBe(true)
  })

  it('is not fooled by a dirty buffer', () => {
    const dirty = new Uint8Array(PIC_W * PIC_H).fill(3)
    renderPicture(dirty, CENTER, 0)
    expect(dirty).toEqual(draw())
  })

  it('does not throw on wild or missing numbers, and never writes outside the palette', () => {
    for (const look of [
      { x: 99, y: -99 },
      { x: NaN, y: NaN },
      { x: Infinity, y: -Infinity },
    ]) {
      for (const blink of [-5, 5, NaN, Infinity]) {
        const out = draw(look, blink)
        for (const v of out) expect(v).toBeLessThan(PALETTE.length)
      }
    }
    expect(draw({ x: 99, y: 99 })).toEqual(draw({ x: 1, y: 1 }))
  })

  it('draws two eyes, each inside the glass of a set', () => {
    const { left, right } = eyes(draw())
    expect(left.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
    expect(left).toHaveLength(right.length)
    for (const [x, y] of [...left, ...right]) expect(seen(x, y)).toBe(true)
  })

  it('keeps both eyes in view wherever they look', () => {
    for (const x of [-1, 0, 1]) {
      for (const y of [-1, 0, 1]) {
        const { all } = eyes(draw({ x, y }))
        expect(all.length).toBeGreaterThan(0)
        for (const [px, py] of all) expect(seen(px, py)).toBe(true)
      }
    }
  })

  it('moves the eyes with the look, by one to two pixels', () => {
    const rest = eyes(draw()).all
    const upLeft = eyes(draw({ x: -1, y: 1 })).all
    const downRight = eyes(draw({ x: 1, y: -1 })).all
    const minX = (e: [number, number][]) => Math.min(...e.map(([x]) => x))
    const minY = (e: [number, number][]) => Math.min(...e.map(([, y]) => y))
    expect(minX(upLeft)).toBeLessThan(minX(rest))
    expect(minY(upLeft)).toBeLessThan(minY(rest))
    expect(minX(downRight)).toBeGreaterThan(minX(rest))
    expect(minY(downRight)).toBeGreaterThan(minY(rest))
    expect(minX(rest) - minX(upLeft)).toBeLessThanOrEqual(2)
    expect(minY(rest) - minY(upLeft)).toBeLessThanOrEqual(2)
    expect(upLeft).toHaveLength(rest.length)
  })

  it('closes the eyes in three steps: open, half, closed', () => {
    const count = (blink: number) => eyes(draw(CENTER, blink)).all.length
    const open = count(0)
    const half = count(0.5)
    const closed = count(1)
    expect(half).toBeLessThan(open)
    expect(half).toBeLessThanOrEqual(open / 2)
    expect(closed).toBeGreaterThan(0)
    expect(closed).toBeLessThanOrEqual(half)
    // In between it is never open again.
    expect(count(0.3)).toBeLessThan(open)
    expect(count(0.3)).toBeGreaterThanOrEqual(half)
  })

  it('squashes each eye toward its own middle and keeps it in the glass', () => {
    const open = eyes(draw()).all
    const line = eyes(draw(CENTER, 1)).all
    const ys = open.map(([, y]) => y)
    const lineYs = line.map(([, y]) => y)
    expect(Math.min(...lineYs)).toBeGreaterThanOrEqual(Math.min(...ys))
    expect(Math.max(...lineYs)).toBeLessThanOrEqual(Math.max(...ys))
    for (const [x, y] of line) expect(seen(x, y)).toBe(true)
  })

  it('puts most of the figure behind the sets', () => {
    const out = draw()
    let figure = 0
    let shown = 0
    for (let y = 0; y < PIC_H; y++) {
      for (let x = 0; x < PIC_W; x++) {
        const v = out[y * PIC_W + x]
        // The glow under the feet is a shadow, not the figure.
        if (v === 0 || v === GLOW) continue
        figure++
        if (seen(x, y)) shown++
      }
    }
    expect(figure).toBeGreaterThan(300)
    expect(shown / figure).toBeGreaterThanOrEqual(0.6)
  })

  it('draws nothing in the top corners, where the pile has no sets', () => {
    const top = SLOTS.filter((s) => s.row === 2)
    const x0 = Math.min(...top.map((s) => s.rect.x0))
    const x1 = Math.max(...top.map((s) => s.rect.x1))
    const rowBottom = Math.max(...top.map((s) => s.rect.y1))
    const middleTop = Math.min(...SLOTS.filter((s) => s.row === 1).map((s) => s.rect.y0))
    for (const look of [CENTER, { x: -1, y: 1 }, { x: 1, y: 1 }]) {
      const out = draw(look)
      for (let y = 0; y < middleTop; y++) {
        for (let x = 0; x < PIC_W; x++) {
          if (x + 1 > x0 && x < x1) continue
          expect(out[y * PIC_W + x], `corner pixel ${x},${y}`).toBe(0)
        }
      }
    }
    expect(rowBottom).toBeLessThan(middleTop)
  })

  it('has the legs on the bottom row of sets and the body above', () => {
    const out = draw()
    const bottom = SLOTS.filter((s) => s.row === 0)
    const y0 = Math.min(...bottom.map((s) => s.rect.y0))
    let feet = 0
    for (let y = Math.ceil(y0); y < PIC_H; y++) {
      for (let x = 0; x < PIC_W; x++) if (out[y * PIC_W + x] === 1) feet++
    }
    expect(feet).toBeGreaterThan(60)
    // Something is drawn in the middle row of sets too (body, arms, eyes).
    const middle = SLOTS.filter((s) => s.row === 1)
    for (const s of middle) {
      let drawn = 0
      for (let y = Math.ceil(s.rect.y0); y < Math.floor(s.rect.y1); y++) {
        for (let x = Math.ceil(s.rect.x0); x < Math.floor(s.rect.x1); x++) {
          if (out[y * PIC_W + x] !== 0) drawn++
        }
      }
      expect(drawn).toBeGreaterThan(20)
    }
  })
})
