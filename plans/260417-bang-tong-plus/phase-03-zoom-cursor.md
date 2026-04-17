# Phase 3: Zoom-to-cursor

**Thời gian ước tính:** 2-3 giờ
**Dependencies:** none (có thể làm song song Phase 2)
**Output:** Component `<ZoomableArea>` + hook, áp 3 tab
**Status:** ✅ DONE (2026-04-17)

---

## 3.1 Nguyên tắc kỹ thuật

- **CSS `zoom`** (không `transform: scale`) — `zoom` thay đổi layout box size → scroll container hoạt động đúng, sticky tự adjust.
- **Ctrl + wheel** → zoom theo cursor, điểm dưới chuột giữ nguyên vị trí screen.
- **Range:** 0.5 → 2.0, step 0.1.
- **Lưu localStorage** per-area (key khác nhau cho mỗi tab).
- **Throttle** bằng `requestAnimationFrame` (không debounce — cần real-time).
- **Global listener** chặn `Ctrl+wheel` default của WebView2.

## 3.2 Hook `use-zoom-to-cursor.ts`

**File mới:** [frontend/src/lib/use-zoom-to-cursor.ts](../../frontend/src/lib/use-zoom-to-cursor.ts) (~90 dòng)

```ts
import { useEffect, useRef, useState, useCallback } from 'react'

const MIN = 0.5, MAX = 2.0, STEP = 0.1

export function useZoomToCursor(storageKey: string) {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey)
    const n = saved ? parseFloat(saved) : 1
    return isNaN(n) ? 1 : Math.max(MIN, Math.min(MAX, n))
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const pendingRef = useRef(false)

  // Keep zoomRef in sync (avoid stale closure in wheel handler)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // Persist to localStorage (debounced via timeout)
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
        const newZoom = Math.max(MIN, Math.min(MAX, oldZoom + direction * STEP))
        if (newZoom === oldZoom) return

        // Math: keep point under cursor fixed.
        // With CSS `zoom`, scrollable content scales both size and scroll offsets.
        // Compute content point (in post-zoom coords) under cursor BEFORE zoom:
        const rect = container.getBoundingClientRect()
        const localX = e.clientX - rect.left  // cursor in container viewport
        const localY = e.clientY - rect.top
        const contentX = container.scrollLeft + localX // point in scrollable coords
        const contentY = container.scrollTop + localY

        const scale = newZoom / oldZoom
        const newContentX = contentX * scale
        const newContentY = contentY * scale

        setZoom(newZoom)

        // After React commits new zoom, fix scroll in next frame
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
```

**Lưu ý quan trọng:**
- `{ passive: false }` bắt buộc để `preventDefault` work.
- `stopPropagation` để tránh nhiều `<ZoomableArea>` cùng bắt.
- Ref pattern cho `zoom` tránh re-attach listener mỗi lần zoom đổi.

## 3.3 Component `zoomable-area.tsx`

**File mới:** [frontend/src/components/zoomable-area.tsx](../../frontend/src/components/zoomable-area.tsx) (~40 dòng)

```tsx
import { ReactNode } from 'react'
import { useZoomToCursor } from '../lib/use-zoom-to-cursor'

interface Props {
  storageKey: string
  children: ReactNode
  className?: string
}

export function ZoomableArea({ storageKey, children, className }: Props) {
  const { zoom, containerRef, reset } = useZoomToCursor(storageKey)

  return (
    <div ref={containerRef} className={className} style={{ overflow: 'auto', height: '100%', position: 'relative' }}>
      <div style={{ zoom }}>
        {children}
      </div>
      {zoom !== 1 && (
        <button onClick={reset}
          className="fixed bottom-4 left-4 px-2 py-1 text-xs opacity-70 hover:opacity-100"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
          {Math.round(zoom * 100)}% ↺
        </button>
      )}
    </div>
  )
}
```

## 3.4 Global listener chặn WebView2 default zoom

**File sửa:** [frontend/src/App.tsx](../../frontend/src/App.tsx)

Thêm trong `useEffect`:
```tsx
useEffect(() => {
  // Prevent browser/WebView2 default zoom on Ctrl+wheel globally.
  // Individual <ZoomableArea> re-enables via stopPropagation.
  const globalWheel = (e: WheelEvent) => {
    if (e.ctrlKey) e.preventDefault()
  }
  document.addEventListener('wheel', globalWheel, { passive: false })

  // Also block Ctrl+=, Ctrl+-, Ctrl+0 browser shortcuts
  const blockKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && ['=', '-', '+', '0'].includes(e.key)) e.preventDefault()
  }
  window.addEventListener('keydown', blockKey)

  return () => {
    document.removeEventListener('wheel', globalWheel)
    window.removeEventListener('keydown', blockKey)
  }
}, [])
```

**Note:** `ZoomableArea` listener attach vào container (đóng `.wheel` trước bubble lên document) + `stopPropagation` → global listener không bắt nữa. Ngoài vùng zoomable, global vẫn chặn zoom toàn app.

## 3.5 Áp dụng 3 tab

### Tab Cá nhân
**File sửa:** [frontend/src/pages/personal.tsx](../../frontend/src/pages/personal.tsx)

Wrap `<AttendanceTable>`:
```tsx
<ZoomableArea storageKey="zoom-personal">
  <AttendanceTable ... />
</ZoomableArea>
```

### Tab Nhóm
**File sửa:** [frontend/src/pages/team.tsx](../../frontend/src/pages/team.tsx)

**CHỈ** wrap `AttendanceTable` bên trái trong `ResizableSplit.left`, **KHÔNG** wrap sidebar phải:
```tsx
<ResizableSplit
  left={
    <div className="flex flex-col h-full p-3 gap-3">
      {/* ... user buttons ... */}
      <ZoomableArea storageKey="zoom-team">
        <AttendanceTable ... />
      </ZoomableArea>
    </div>
  }
  right={/* sidebar unchanged */}
/>
```

### Tab Bảng tổng
Đã có trong Phase 2 — wrap `<MatrixTable>` trong `<ZoomableArea storageKey="zoom-matrix">`.

## 3.6 Gotchas đã lường

| Issue | Giải pháp |
|---|---|
| `getBoundingClientRect` trả size sau zoom → toạ độ lệch | `clientX/Y` vẫn viewport space, `rect.left/top` cũng post-zoom → ratio đúng. Test kỹ. |
| Sticky cột trong zoomed content bị lệch | CSS `zoom` preserve sticky (khác `scale`). Test ở 150% + 50%. |
| Input focus + zoom → cursor blink không đúng chỗ | Biết trước: không có fix hoàn hảo, acceptable. |
| Multi-select drag khi zoom ≠ 100% → bounding box lệch | Dùng `elementFromPoint` thay vì tính math. Phase 2 đã note. |
| Zoom level mới lưu trước scroll adjust → flash | 2 lần `requestAnimationFrame` (1 cho setZoom commit, 1 cho scroll fix). |

## 3.7 Build & test checklist

- [ ] Ctrl+wheel trên tab Cá nhân: bảng zoom, sidebar phải (nếu có) KHÔNG zoom
- [ ] Ctrl+wheel trên tab Nhóm: CHỈ bảng trái zoom, sidebar phải giữ nguyên size
- [ ] Ctrl+wheel trên tab Bảng tổng: matrix zoom, app header không zoom
- [ ] Ngoài vùng zoomable (ví dụ header): Ctrl+wheel KHÔNG làm WebView2 zoom app
- [ ] Reload app: zoom level restore đúng từ localStorage
- [ ] Indicator "% ↺" hiện khi zoom ≠ 100%, click reset về 100%
- [ ] Zoom 200% + scroll: cursor stay-in-place chính xác ±5px
- [ ] Zoom 50%: table vẫn tương tác được, sticky OK
- [ ] Chuyển tab khi đang zoom: zoom từng tab độc lập (lưu riêng)

## 3.8 Files touched

| File | Action | Est. lines |
|---|---|---|
| `lib/use-zoom-to-cursor.ts` | New | ~90 |
| `components/zoomable-area.tsx` | New | ~40 |
| `App.tsx` | Edit | +15 |
| `pages/personal.tsx` | Edit | +3 |
| `pages/team.tsx` | Edit | +3 |
| `pages/matrix.tsx` | Edit (Phase 2 đã có) | 0 |

**Total:** ~150 dòng mới. Không file nào vượt 200.
