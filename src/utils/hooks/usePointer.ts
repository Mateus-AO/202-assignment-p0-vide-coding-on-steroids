import { useEffect, useRef } from 'react'

export type PointerPosition = { x: number; y: number }

/**
 * The mouse position in [-1, 1] on both axes (y up), kept in a ref so reading it each frame
 * costs nothing. It stays null until a real mouse moves, so touch screens never get one, and
 * returns to the center when the mouse leaves the window.
 */
export function usePointer() {
  const pointer = useRef<PointerPosition | null>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      pointer.current ??= { x: 0, y: 0 }
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = 1 - (e.clientY / window.innerHeight) * 2
    }
    const onLeave = () => {
      if (pointer.current) pointer.current.x = pointer.current.y = 0
    }
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return pointer
}
