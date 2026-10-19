import { Caption, type ProgressSource } from '@/components/Caption'
import { captionLabel } from '@/core/caption'
import { getFrame, useAppStore } from './store'

/** The active world's progress, read from the store without subscribing React to it. */
const worldProgress: ProgressSource = {
  get: () => getFrame().u,
  subscribe: (listener) => useAppStore.subscribe(() => listener()),
}

export function Captions() {
  const caption = useAppStore((s) => s.frame.caption)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 p-4 sm:p-8">
      {caption && (
        <Caption key={captionLabel(caption)} caption={caption} source={worldProgress} />
      )}
    </div>
  )
}
