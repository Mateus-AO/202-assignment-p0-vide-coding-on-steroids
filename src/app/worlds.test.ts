import { describe, expect, it } from 'vitest'
import { frameAt, scrollBoundary } from '@/core/timeline'
import { validateHandoffs } from '@/core/world'
import { mechanics } from '@/worlds/platformer'
import { recovered } from '@/worlds/terminal'
import { worlds } from './worlds'

describe('the real page', () => {
  it('has valid worlds and seamless handoffs', () => {
    expect(() => validateHandoffs(worlds)).not.toThrow()
  })

  it('is continuous across every swap, at any aspect', () => {
    worlds.slice(0, -1).forEach((_, i) => {
      const boundary = scrollBoundary(worlds, i + 1)
      const before = frameAt(worlds, boundary - 1e-9)
      const after = frameAt(worlds, boundary)
      expect(before.index).toBe(i)
      expect(after.index).toBe(i + 1)
      if (before.world.exit?.kind === 'cover') {
        expect(before.cover).toMatchObject({ mode: 1 })
        expect(before.cover.t).toBeCloseTo(1)
        expect(after.cover).toMatchObject({ mode: 2, t: 0 })
      } else {
        expect(before.portal?.blend).toBeCloseTo(1)
      }
    })
  })

  it('starts on the loading screen and flies through a portal into Pong', () => {
    expect(worlds[0].id).toBe('starter')
    expect(worlds[0].exit?.kind).toBe('portal')
    expect(worlds[1].id).toBe('pong')
    expect(frameAt(worlds, 0).index).toBe(0)
    expect(frameAt(worlds, scrollBoundary(worlds, 1)).world.id).toBe('pong')
  })

  it("shows the terminal the platformer's real numbers", () => {
    expect(recovered).toEqual(mechanics)
  })

  it('hands the platformer over to the terminal through a black cover', () => {
    const platformer = worlds.find((w) => w.id === 'platformer')!
    expect(platformer.exit).toMatchObject({ kind: 'cover', style: 'black' })
    const i = worlds.indexOf(platformer)
    expect(worlds[i + 1].id).toBe('terminal')
    const boundary = scrollBoundary(worlds, i + 1)
    expect(frameAt(worlds, boundary - 1e-9).cover).toMatchObject({
      mode: 1,
      style: 'black',
    })
    expect(frameAt(worlds, boundary).cover).toMatchObject({
      mode: 2,
      t: 0,
      style: 'black',
    })
  })

  it('ends on the arena, which the wall reaches through a glitch cover', () => {
    const last = worlds[worlds.length - 1]
    expect(last.id).toBe('arena')
    expect(last.exit).toBeUndefined()
    const wall = worlds[worlds.length - 2]
    expect(wall.id).toBe('wall')
    expect(wall.exit).toMatchObject({ kind: 'cover', style: 'glitch' })
    const boundary = scrollBoundary(worlds, worlds.length - 1)
    expect(frameAt(worlds, boundary - 1e-9).cover).toMatchObject({
      mode: 1,
      style: 'glitch',
    })
    expect(frameAt(worlds, boundary).cover).toMatchObject({
      mode: 2,
      t: 0,
      style: 'glitch',
    })
    expect(frameAt(worlds, 1).u).toBe(1)
    expect(frameAt(worlds, 1).cover.mode).toBe(0)
  })
})
