import { create } from 'zustand'
import { frameAt, type Frame } from '@/core/timeline'
import { worlds } from './worlds'

type AppState = {
  /** Everything the page draws, derived from scroll. Replaced on every scroll event. */
  frame: Frame
  setFrame: (frame: Frame) => void
}

export const useAppStore = create<AppState>((set) => ({
  frame: frameAt(worlds, 0),
  setFrame: (frame) => set({ frame }),
}))

/** Current frame, for reading inside render loops without subscribing. */
export const getFrame = () => useAppStore.getState().frame
