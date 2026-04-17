import { useEffect, useRef, useState, useCallback } from 'react'

const MIN = 0.5
const MAX = 2.0
const STEP = 0.1

function clamp(n: number): number {
  return Math.max(MIN, Math.min(MAX, n))
}

export function useZoomToCursor(storageKey: string) {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey)
    const n = saved ? parseFloat(saved) : 1
    return isNaN(n) ? 1 : clamp(n)
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const pendingRef = useRef(false)

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(storageKey, String(zoom)), 200)
    return () => clearTimeout(t)
  }, [zoom, storageKey])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      e.stopPropagation()
      if (pendingRef.current) return
      pendingRef.current = true

      requestAnimationFrame(() => {
        pendingRef.current = false
        const oldZoom = zoomRef.current
        const direction = e.deltaY > 0 ? -1 : 1
        const newZoom = clamp(Math.round((oldZoom + direction * STEP) * 10) / 10)
        if (newZoom === oldZoom) return

        const rect = container.getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const contentX = container.scrollLeft + localX
        const contentY = container.scrollTop + localY

        const scale = newZoom / oldZoom
        const newContentX = contentX * scale
        const newContentY = contentY * scale

        setZoom(newZoom)

        requestAnimationFrame(() => {
          container.scrollLeft = newContentX - localX
          container.scrollTop = newContentY - localY
        })
      })
    }

    container.addEventListener('wheel', handler, { passive: false })
    return () => container.removeEventListener('wheel', handler)
  }, [])

  const reset = useCallback(() => setZoom(1), [])

  return { zoom, containerRef, reset }
}

export const ZOOM_MIN = MIN
export const ZOOM_MAX = MAX
export const ZOOM_STEP = STEP
