import { describe, expect, it } from 'vitest'
import { bootLog } from './captions'
import {
  BAR_CELLS,
  bootedViewInto,
  bootViewInto,
  createBootView,
  GIVE_UP_SECONDS,
  MIN_BOOT_SECONDS,
  TASKS,
} from './loading'

const all = Object.fromEntries(TASKS.map((t) => [t, true as const]))
const view = (done: Record<string, true>, elapsed: number, o = {}) =>
  bootViewInto(createBootView(), bootLog, done, elapsed, o)

describe('boot view', () => {
  it('is empty at the start', () => {
    expect(view({}, 0)).toMatchObject({
      typed: 0,
      okMask: 0,
      cells: 0,
      percent: 0,
      ready: false,
    })
  })

  it('is not ready before the minimum boot time, even if everything is done', () => {
    const v = view(all, MIN_BOOT_SECONDS - 0.1)
    expect(v.ready).toBe(false)
    expect(v.percent).toBeLessThan(100)
    expect(view(all, MIN_BOOT_SECONDS).ready).toBe(true)
  })

  it('does not run ahead of the real work', () => {
    const v = view({ fonts: true }, 10)
    expect(v.ready).toBe(false)
    expect(v.percent).toBe(33)
    expect(v.cells).toBe(Math.floor(BAR_CELLS / 3))
  })

  it('is not ready while one task is missing, until it gives up', () => {
    const missing = { fonts: true, shaders: true } as Record<string, true>
    expect(view(missing, GIVE_UP_SECONDS - 0.5).ready).toBe(false)
    expect(view(missing, GIVE_UP_SECONDS).ready).toBe(true)
  })

  it('shows OK on a task line only once its task finished', () => {
    const fontsLine = bootLog.findIndex((l) => l.task === 'fonts')
    const bit = 1 << fontsLine
    expect(view({}, 5).okMask & bit).toBe(0)
    expect(view({ fonts: true }, 5).okMask & bit).toBe(bit)
    // A line without a task is OK as soon as it is typed.
    expect(view({}, 5).okMask & 1).toBe(1)
  })

  it('types the log out over time, and a line only counts once typed', () => {
    const early = view({}, 0.1)
    expect(early.typed).toBeGreaterThan(0)
    expect(early.typed).toBeLessThan(bootLog[0].text.length + 1)
    expect(early.okMask).toBe(0)
  })

  it('shows lines whole in line-wise mode', () => {
    const v = view({}, 0.05, { lineWise: true })
    expect(v.typed).toBeGreaterThanOrEqual(bootLog[0].text.length)
  })

  it('has a booted view with everything done', () => {
    const v = bootedViewInto(createBootView(), bootLog)
    expect(v.ready).toBe(true)
    expect(v.cells).toBe(BAR_CELLS)
    expect(v.okMask).toBe((1 << bootLog.length) - 1)
  })

  it('has a log that fits the screen: at most six lines, every task named', () => {
    expect(bootLog.length).toBeLessThanOrEqual(6)
    for (const t of TASKS) expect(bootLog.some((l) => l.task === t)).toBe(true)
  })
})
