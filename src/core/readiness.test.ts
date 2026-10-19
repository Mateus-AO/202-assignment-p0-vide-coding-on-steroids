import { beforeEach, describe, expect, it } from 'vitest'
import { markReady, useReadiness } from './readiness'

describe('readiness', () => {
  beforeEach(() => useReadiness.setState({ ready: {} }))

  it('records ids and ignores repeats', () => {
    markReady('fonts')
    const first = useReadiness.getState().ready
    markReady('fonts')
    expect(useReadiness.getState().ready).toBe(first)
    expect(first.fonts).toBe(true)
    expect(first.other).toBeUndefined()
  })
})
