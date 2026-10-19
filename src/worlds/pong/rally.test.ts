import { describe, expect, it } from 'vitest'
import { beats } from './beats'
import {
  BALL_X_AT_BLOCK,
  BALL_X_AT_PADDLE,
  BALL_Y_AT_WALL,
  BLOCK_POS,
  BLOCK_SIZE,
  PADDLE_HALF_H,
} from './court'
import {
  ballAt,
  BLOCK_HIT_U,
  HITS,
  hitPulse,
  hitsPassed,
  paddleY,
  scoreAtInto,
} from './rally'

const STEPS = 4000

describe('rally', () => {
  it('has a real rally: at least 8 contacts before the block, on both paddles and the walls', () => {
    const before = HITS.filter((h) => h.kind !== 'block')
    expect(before.length).toBeGreaterThanOrEqual(8)
    for (const kind of ['paddleL', 'paddleR', 'wall'] as const) {
      expect(before.filter((h) => h.kind === kind).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('is deterministic and reversible (pure function of u)', () => {
    for (const u of [0, 0.1, 0.2, 0.33, 0.45, 0.6]) expect(ballAt(u)).toEqual(ballAt(u))
  })

  it('starts on the left paddle and strikes the block exactly when it starts to crack', () => {
    expect(ballAt(0)[0]).toBeCloseTo(-BALL_X_AT_PADDLE)
    expect(BLOCK_HIT_U).toBeCloseTo(beats.ranges.crack[0])
    const [x, y] = ballAt(BLOCK_HIT_U)
    expect(x).toBeCloseTo(BALL_X_AT_BLOCK)
    expect(y).toBeCloseTo(BLOCK_POS[1])
    expect(HITS[HITS.length - 1].kind).toBe('block')
  })

  it('hits the block twice, the second strike being the last contact', () => {
    expect(HITS.filter((h) => h.kind === 'block').length).toBe(2)
    expect(HITS[HITS.length - 1].kind).toBe('block')
  })

  it('stays inside the court', () => {
    for (let i = 0; i <= STEPS; i++) {
      const [x, y] = ballAt(i / STEPS)
      expect(Math.abs(x)).toBeLessThanOrEqual(BALL_X_AT_PADDLE + 1e-9)
      expect(Math.abs(y)).toBeLessThanOrEqual(BALL_Y_AT_WALL + 1e-9)
    }
  })

  it('touches the wall face at every wall hit and the paddle face at every paddle hit', () => {
    for (const h of HITS) {
      const [x, y] = ballAt(h.u)
      if (h.kind === 'wall') expect(Math.abs(y)).toBeCloseTo(BALL_Y_AT_WALL)
      if (h.kind === 'paddleL') expect(x).toBeCloseTo(-BALL_X_AT_PADDLE)
      if (h.kind === 'paddleR') expect(x).toBeCloseTo(BALL_X_AT_PADDLE)
    }
  })

  it('never passes through the block before the final strike', () => {
    const left = BLOCK_POS[0] - BLOCK_SIZE / 2 - 0.2
    const right = BLOCK_POS[0] + BLOCK_SIZE / 2 + 0.2
    const half = BLOCK_SIZE / 2 + 0.2
    for (let i = 0; i < STEPS; i++) {
      const u = (i / STEPS) * (BLOCK_HIT_U - 0.002)
      const [x, y] = ballAt(u)
      const inside = x > left + 1e-6 && x < right && Math.abs(y) < half
      expect(inside, `ball inside block at u=${u}, (${x}, ${y})`).toBe(false)
    }
  })

  it('moves at a steady speed (no teleporting) during the rally', () => {
    let last = ballAt(0)
    let maxStep = 0
    for (let i = 1; i <= STEPS; i++) {
      const p = ballAt((i / STEPS) * BLOCK_HIT_U)
      maxStep = Math.max(maxStep, Math.hypot(p[0] - last[0], p[1] - last[1]))
      last = p
    }
    const typical = Math.hypot(...ballAt(BLOCK_HIT_U).map((v, k) => v - ballAt(0)[k]))
    expect(maxStep).toBeLessThan(typical / 100)
  })
})

describe('paddles', () => {
  it('are exactly at the ball at each of their hits (well within reach)', () => {
    for (const h of HITS) {
      if (h.kind !== 'paddleL' && h.kind !== 'paddleR') continue
      const [, y] = ballAt(h.u)
      expect(Math.abs(paddleY(h.kind, h.u) - y)).toBeLessThan(PADDLE_HALF_H * 0.1)
    }
  })

  it('stay inside the court', () => {
    for (let i = 0; i <= STEPS; i++) {
      for (const side of ['paddleL', 'paddleR'] as const) {
        expect(Math.abs(paddleY(side, i / STEPS))).toBeLessThanOrEqual(3.3 + 1e-9)
      }
    }
  })
})

describe('scoreboard and pulses', () => {
  it('counts paddle hits, never going down', () => {
    const out = { l: 0, r: 0 }
    let lastL = 0
    let lastR = 0
    for (let i = 0; i <= 500; i++) {
      scoreAtInto(i / 500, out)
      expect(out.l).toBeGreaterThanOrEqual(lastL)
      expect(out.r).toBeGreaterThanOrEqual(lastR)
      lastL = out.l
      lastR = out.r
    }
    const total = HITS.filter((h) => h.kind === 'paddleL').length
    expect(scoreAtInto(1, out).l).toBe(total)
  })

  it('pulses at hits and is calm elsewhere', () => {
    expect(hitPulse(BLOCK_HIT_U, ['block'], 0.01)).toBeCloseTo(1)
    expect(hitPulse(BLOCK_HIT_U + 0.1, ['block'], 0.01)).toBe(0)
  })

  it('counts impacts without the opening serve, so resting at u = 0 triggers nothing', () => {
    expect(hitsPassed(0, ['paddleL', 'paddleR', 'block'])).toBe(0)
    expect(hitsPassed(1, ['paddleL', 'paddleR', 'block'])).toBe(
      HITS.length - HITS.filter((h) => h.kind === 'wall').length - 1,
    )
  })
})
