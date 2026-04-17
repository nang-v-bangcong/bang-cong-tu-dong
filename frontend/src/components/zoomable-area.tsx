import { type ReactNode } from 'react'
import { useZoomToCursor } from '../lib/use-zoom-to-cursor'

interface Props {
  storageKey: string
  children: ReactNode
  className?: string
}

export function ZoomableArea({ storageKey, children, className }: Props) {
  const { zoom, containerRef, reset } = useZoomToCursor(storageKey)

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: 'auto', height: '100%', position: 'relative' }}
    >
      {/* CSS `zoom` preserves sticky/scroll semantics (unlike transform: scale). */}
      <div style={{ zoom } as any}>
        {children}
      </div>
      {zoom !== 1 && (
        <button
          onClick={reset}
          title="Nhấn để về 100%"
          className="absolute bottom-3 left-3 z-10 px-2 py-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
          }}
        >
          {Math.round(zoom * 100)}% ↺
        </button>
      )}
    </div>
  )
}
