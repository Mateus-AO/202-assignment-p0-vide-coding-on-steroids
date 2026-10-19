export function WebGLFallback({ className = '' }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center text-muted ${className}`}
      role="img"
      aria-label="3D content unavailable"
    >
      3D content is unavailable on this device.
    </div>
  )
}
