import { describe, expect, it } from 'vitest'
import { getStorage, readFlag, writeFlag } from './preference'

const memory = () => {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}
const throwing = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('sound preference', () => {
  it('is off when nothing is stored', () => {
    expect(readFlag(memory(), 'k')).toBe(false)
    expect(readFlag(null, 'k')).toBe(false)
  })

  it('round-trips on and off', () => {
    const s = memory()
    writeFlag(s, 'k', true)
    expect(readFlag(s, 'k')).toBe(true)
    writeFlag(s, 'k', false)
    expect(readFlag(s, 'k')).toBe(false)
  })

  it('survives storage that throws', () => {
    expect(() => writeFlag(throwing, 'k', true)).not.toThrow()
    expect(readFlag(throwing, 'k')).toBe(false)
  })

  it('has no storage outside a browser', () => {
    expect(getStorage()).toBeNull()
  })
})
