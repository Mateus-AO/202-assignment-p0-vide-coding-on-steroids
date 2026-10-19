import { describe, expect, it } from 'vitest'
import { crackPixelOrder } from './crack'
import { crackAtlasData } from './crackAtlas'

const lit = (data: Uint8Array, stage: number, stages: number, size: number) => {
  let n = 0
  const width = stages * size
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (data[(y * width + stage * size + x) * 4 + 3] === 255) n++
  return n
}

describe('crackAtlasData', () => {
  const stages = 10
  const size = 16
  const data = crackAtlasData(stages, size)

  it('is a stages*size by size RGBA strip and deterministic', () => {
    expect(data).toHaveLength(stages * size * size * 4)
    expect(crackAtlasData(stages, size)).toEqual(data)
  })

  it('adds cracks at every stage, ending with all of them', () => {
    const counts = Array.from({ length: stages }, (_, s) => lit(data, s, stages, size))
    for (let s = 1; s < stages; s++) expect(counts[s]).toBeGreaterThan(counts[s - 1])
    expect(counts[stages - 1]).toBe(crackPixelOrder(size, 7).length)
  })

  it('keeps each stage a superset of the previous one', () => {
    const width = stages * size
    for (let s = 1; s < stages; s++)
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const before = data[(y * width + (s - 1) * size + x) * 4 + 3]
          const now = data[(y * width + s * size + x) * 4 + 3]
          if (before === 255) expect(now).toBe(255)
        }
  })
})
