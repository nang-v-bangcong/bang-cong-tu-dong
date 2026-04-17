import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZoomToCursor, ZOOM_MIN, ZOOM_MAX } from './use-zoom-to-cursor'

describe('useZoomToCursor', () => {
  beforeEach(() => { localStorage.clear() })

  it('defaults to 1 when no saved value', () => {
    const { result } = renderHook(() => useZoomToCursor('k'))
    expect(result.current.zoom).toBe(1)
  })

  it('restores saved zoom from localStorage', () => {
    localStorage.setItem('zoom-test', '1.5')
    const { result } = renderHook(() => useZoomToCursor('zoom-test'))
    expect(result.current.zoom).toBe(1.5)
  })

  it('clamps restored value below MIN', () => {
    localStorage.setItem('k', '0.1')
    const { result } = renderHook(() => useZoomToCursor('k'))
    expect(result.current.zoom).toBe(ZOOM_MIN)
  })

  it('clamps restored value above MAX', () => {
    localStorage.setItem('k', '5')
    const { result } = renderHook(() => useZoomToCursor('k'))
    expect(result.current.zoom).toBe(ZOOM_MAX)
  })

  it('ignores invalid saved value (NaN)', () => {
    localStorage.setItem('k', 'garbage')
    const { result } = renderHook(() => useZoomToCursor('k'))
    expect(result.current.zoom).toBe(1)
  })

  it('reset() returns zoom to 1', async () => {
    localStorage.setItem('k', '1.8')
    const { result } = renderHook(() => useZoomToCursor('k'))
    expect(result.current.zoom).toBe(1.8)
    act(() => { result.current.reset() })
    expect(result.current.zoom).toBe(1)
  })

  it('persists zoom to localStorage after change', async () => {
    const { result, rerender } = renderHook(() => useZoomToCursor('zoom-persist'))
    act(() => { result.current.reset() })
    rerender()
    await new Promise((r) => setTimeout(r, 250))
    expect(localStorage.getItem('zoom-persist')).toBe('1')
  })
})
