import { create } from 'zustand'

type ReadinessState = {
  /** Ids of the things that have finished starting up. */
  ready: Readonly<Record<string, true>>
  markReady: (id: string) => void
}

/**
 * What has genuinely finished at startup (fonts loaded, shaders compiled, the next world
 * mounted and compiled). Anything may mark an id; the first world's loading screen reads
 * them. Marking twice is harmless.
 */
export const useReadiness = create<ReadinessState>((set, get) => ({
  ready: {},
  markReady: (id) => {
    if (get().ready[id]) return
    set((s) => ({ ready: { ...s.ready, [id]: true } }))
  },
}))

export const markReady = (id: string) => useReadiness.getState().markReady(id)

/** An id other modules agree on: the world after the active one is mounted and compiled. */
export const READY_NEXT_WORLD = 'next-world'
