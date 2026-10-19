import { clamp, smoothstep } from '@/utils/math'

type Range = readonly [from: number, to: number]

/**
 * Named stretches of a world's progress, declared once and read by the scene, the camera
 * and the exit. Retiming a beat is one edit here.
 */
export function defineBeats<K extends string>(ranges: Record<K, Range>) {
  for (const [name, [from, to]] of Object.entries<Range>(ranges)) {
    if (!(from >= 0 && from < to && to <= 1)) {
      throw new Error(
        `beat "${name}" must satisfy 0 <= from < to <= 1, got [${from}, ${to}]`,
      )
    }
  }
  return {
    ranges,
    /** Linear 0 → 1 across the beat (0 before it, 1 after it). */
    linear: (name: K, u: number) =>
      clamp((u - ranges[name][0]) / (ranges[name][1] - ranges[name][0]), 0, 1),
    /** Eased 0 → 1 across the beat. */
    smooth: (name: K, u: number) => smoothstep(ranges[name][0], ranges[name][1], u),
    /** True from the beat's start onward. */
    started: (name: K, u: number) => u >= ranges[name][0],
    /** True while `u` is inside the beat. */
    during: (name: K, u: number) => u >= ranges[name][0] && u < ranges[name][1],
  }
}

export type Beats<K extends string> = ReturnType<typeof defineBeats<K>>
