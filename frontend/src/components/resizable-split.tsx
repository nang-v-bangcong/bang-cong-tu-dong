import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  left: React.ReactNode
  right: React.ReactNode
  defaultRightWidth?: number
  minRightWidth?: number
  maxRightWidth?: number
}

export function ResizableSplit({ left, right, defaultRightWidth = 220, minRightWidth = 160, maxRightWidth = 400 }: Props) {
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('splitRightWidth')
    return saved ? Number(saved) : defaultRightWidth
  })
  const dragging = useRef(false)
  const widthRef = useRef(rightWidth)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRight = rect.right - e.clientX
      const clamped = Math.max(minRightWidth, Math.min(maxRightWidth, newRight))
      widthRef.current = clamped
      setRightWidth(clamped)
    }

    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem('splitRightWidth', String(widthRef.current))
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [minRightWidth, maxRightWidth])

  return (
    <div ref={containerRef} className="flex h-full">
      <div className="flex-1 min-w-0">{left}</div>
      <div
        onMouseDown={onMouseDown}
        className="w-[4px] cursor-col-resize flex-shrink-0 transition-colors"
        style={{ background: 'var(--border)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border)')}
      />
      <div style={{ width: rightWidth }} className="flex-shrink-0 overflow-auto">
        {right}
      </div>
    </div>
  )
}
