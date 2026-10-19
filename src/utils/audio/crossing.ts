/**
 * Collects the items whose time `at` is crossed moving forward, keeping only the latest `max`
 * (a fast fling must not fire a machine-gun burst). Reused across frames: nothing is allocated
 * after `createPicker`.
 */
export type Picker<T> = { items: T[]; count: number; readonly max: number }

export const createPicker = <T>(max: number): Picker<T> => ({ items: [], count: 0, max })

export function resetPicker(picker: Picker<unknown>) {
  picker.count = 0
}

/** Number of items picked so far (at most `max`). They are `items[0 .. pickedCount)`. */
export const pickedCount = (picker: Picker<unknown>) => Math.min(picker.count, picker.max)

/**
 * Adds every item of `sorted` (ascending `at`) with `from < at <= to`. Nothing when `to <= from`:
 * moving backward is silent. Items for which `skip` returns true are left out.
 */
export function pickCrossed<T extends { at: number }>(
  sorted: readonly T[],
  from: number,
  to: number,
  picker: Picker<T>,
  skip?: (item: T) => boolean,
) {
  if (!(to > from)) return
  for (const item of sorted) {
    if (item.at > to) break
    if (item.at <= from || skip?.(item)) continue
    picker.items[picker.count % picker.max] = item
    picker.count++
  }
}
