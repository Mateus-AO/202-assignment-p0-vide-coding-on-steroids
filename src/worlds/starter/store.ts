import { create } from 'zustand'

type StarterState = {
  /** The loading screen has finished once (min boot time and real readiness). Stays true. */
  booted: boolean
  /** Play has been pressed once: the scroll is unlocked for good. */
  played: boolean
  setBooted: () => void
  setPlayed: () => void
}

/**
 * Loading-screen state shared by the scene (which sets `booted`) and the Play button in the DOM.
 * Read it imperatively inside useFrame; the scene's picture itself is a function of progress.
 */
export const useStarterStore = create<StarterState>((set) => ({
  booted: false,
  played: false,
  setBooted: () => set({ booted: true }),
  setPlayed: () => set({ played: true }),
}))

/** Dev only: jump past the loading screen, e.g. when a pinned `?progress=` is used. */
export const skipBoot = () => useStarterStore.setState({ booted: true, played: true })
