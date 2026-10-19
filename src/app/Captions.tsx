import { Caption } from '@/components/Caption'
import { captionLabel } from '@/core/caption'
import { useAppStore } from './store'

export function Captions() {
  const caption = useAppStore((s) => s.frame.caption)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 p-4 sm:p-8">
      {caption && <Caption key={captionLabel(caption)} caption={caption} />}
    </div>
  )
}
