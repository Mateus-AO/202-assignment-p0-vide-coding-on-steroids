import { describe, expect, it } from 'vitest'
import { defineBeats } from './beats'
import { defineWorld, validateHandoffs, type PortalExit, type WorldModule } from './world'

const base = (over: Partial<WorldModule> = {}): WorldModule => ({
  id: 'w',
  Scene: () => null,
  cameraPath: (u) => ({ position: [u, 0, 0], target: [u, 0, -1] }),
  captions: [],
  ...over,
})

const portal: PortalExit = {
  kind: 'portal',
  position: [1, 0, 0],
  size: [2, 2],
  openAt: 0.5,
  blendRange: [0.6, 0.9],
}

describe('defineWorld', () => {
  it('accepts a well-formed world', () => {
    expect(() => defineWorld(base({ exit: portal }))).not.toThrow()
  })
  it('rejects a portal that the camera does not end at', () => {
    expect(() => defineWorld(base({ exit: { ...portal, position: [5, 0, 0] } }))).toThrow(
      /portal position/,
    )
  })
  it('rejects a portal that opens after it starts blending', () => {
    expect(() => defineWorld(base({ exit: { ...portal, openAt: 0.7 } }))).toThrow(
      /openAt/,
    )
  })
  it('rejects bad cover timing', () => {
    expect(() =>
      defineWorld(
        base({
          exit: { kind: 'cover', whiteFrom: 0.9, whiteFull: 0.8, revealLength: 0.3 },
        }),
      ),
    ).toThrow(/cover/)
    expect(() =>
      defineWorld(
        base({
          exit: { kind: 'cover', whiteFrom: 0.8, whiteFull: 0.9, revealLength: 0 },
        }),
      ),
    ).toThrow(/revealLength/)
  })
  it('rejects bad caption ranges', () => {
    expect(() =>
      defineWorld(base({ captions: [{ from: 0.5, to: 0.2, text: 'x' }] })),
    ).toThrow(/caption/)
  })
})

describe('validateHandoffs', () => {
  const a = defineWorld(base({ id: 'a', exit: portal }))
  it('accepts matching directions', () => {
    expect(() => validateHandoffs([a, base({ id: 'b' })])).not.toThrow()
  })
  it('rejects a camera direction jump across a portal', () => {
    const tilted = base({
      id: 'b',
      cameraPath: () => ({ position: [0, 0, 0], target: [0, -1, -1] }),
    })
    expect(() => validateHandoffs([a, tilted])).toThrow(/jumps/)
  })
  it('rejects an exit on the last world and a missing exit on others', () => {
    expect(() => validateHandoffs([a])).toThrow(/last world/)
    expect(() => validateHandoffs([base({ id: 'x' }), base({ id: 'y' })])).toThrow(
      /needs an exit/,
    )
  })
})

describe('defineBeats', () => {
  const beats = defineBeats({ go: [0.2, 0.6] })
  it('reads a beat linearly and eased', () => {
    expect(beats.linear('go', 0.4)).toBeCloseTo(0.5)
    expect(beats.smooth('go', 0.1)).toBe(0)
    expect(beats.smooth('go', 0.9)).toBe(1)
  })
  it('knows when a beat has started or is running', () => {
    expect(beats.started('go', 0.2)).toBe(true)
    expect(beats.during('go', 0.6)).toBe(false)
  })
  it('rejects malformed ranges', () => {
    expect(() => defineBeats({ bad: [0.6, 0.2] })).toThrow(/bad/)
    expect(() => defineBeats({ bad: [0, 1.5] })).toThrow(/bad/)
  })
})
