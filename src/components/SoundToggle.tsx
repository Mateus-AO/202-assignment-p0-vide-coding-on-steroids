type Props = { on: boolean; onToggle: () => void }

/** Small pixel speaker button. Static: no animation, no flash. */
export function SoundToggle({ on, onToggle }: Props) {
  return (
    <button
      type="button"
      data-sound-toggle
      aria-pressed={on}
      aria-label="Sound"
      title={on ? 'Sound on' : 'Sound off'}
      onClick={onToggle}
      className="pixel-button fixed right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 8 8"
        aria-hidden
        shapeRendering="crispEdges"
      >
        <path fill="currentColor" d="M0 3h2v2H0zM2 2h1v4H2zM3 1h1v6H3z" />
        {on ? (
          <path fill="currentColor" d="M5 3h1v2H5zM6 1h1v1H6zM7 2h1v4H7zM6 6h1v1H6z" />
        ) : (
          <path
            fill="currentColor"
            d="M5 2h1v1H5zM7 2h1v1H7zM6 3h1v2H6zM5 5h1v1H5zM7 5h1v1H7z"
          />
        )}
      </svg>
      <span>{on ? 'SOUND ON' : 'SOUND OFF'}</span>
    </button>
  )
}
