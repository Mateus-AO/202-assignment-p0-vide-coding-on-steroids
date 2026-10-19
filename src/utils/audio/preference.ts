type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>

/** `localStorage`, or null where it is missing or throws (private mode, blocked cookies). */
export function getStorage(): FlagStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** A remembered on/off choice; `fallback` when there is none or storage fails. */
export function readFlag(storage: FlagStorage | null, key: string, fallback = false) {
  try {
    const value = storage?.getItem(key)
    return value === '1' ? true : value === '0' ? false : fallback
  } catch {
    return fallback
  }
}

/** Remembers an on/off choice. Silently does nothing if storage fails. */
export function writeFlag(storage: FlagStorage | null, key: string, value: boolean) {
  try {
    storage?.setItem(key, value ? '1' : '0')
  } catch {
    // The choice just won't survive a reload.
  }
}
