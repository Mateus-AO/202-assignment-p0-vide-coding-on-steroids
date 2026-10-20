import { Caption, type ProgressSource } from '@/components/Caption'
import { captionLabel } from '@/core/caption'
import { resolveCaptionAnchor, resolveCaptionTheme } from '@/core/captionTheme'
import { getFrame, useAppStore } from './store'

/** The active world's progress, read from the store without subscribing React to it. */
const worldProgress: ProgressSource = {
  get: () => getFrame().u,
  subscribe: (listener) => useAppStore.subscribe(() => listener()),
}

/**
 * Where the box sits. A top box clears the sound button in the top corner (about 56 px on
 * phones, 64 px on larger screens).
 */
const ANCHOR_CLASS = {
  bottom: 'bottom-0',
  'bottom-right': 'bottom-0',
  top: 'top-0 pt-14 sm:pt-16',
} as const

export function Captions() {
  const caption = useAppStore((s) => s.frame.caption)
  const worldTheme = useAppStore((s) => s.frame.world.theme)
  const theme = resolveCaptionTheme(caption, worldTheme)
  const anchor = resolveCaptionAnchor(caption, theme)

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-10 p-4 sm:p-8 ${ANCHOR_CLASS[anchor]}`}
      data-anchor={anchor}
    >
      {caption && (
        <Caption
          key={captionLabel(caption)}
          caption={caption}
          source={worldProgress}
          theme={theme}
        />
      )}
    </div>
  )
}
