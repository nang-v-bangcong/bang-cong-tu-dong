# Phase 2: Matrix UI — Tab "Bảng tổng"

**Thời gian ước tính:** 8-10 giờ
**Dependencies:** Phase 1 (backend API ready)
**Output:** Tab thứ 3 "Bảng tổng" hoạt động đầy đủ
**Status:** ✅ DONE (2026-04-17)

---

## 2.1 Store update

**File sửa:** [frontend/src/stores/app-store.ts](../../frontend/src/stores/app-store.ts)

```ts
type Tab = 'personal' | 'team' | 'matrix'  // thêm 'matrix'
```

Không cần field khác. Tab state đã có.

## 2.2 Header — thêm nút tab

**File sửa:** [frontend/src/components/header.tsx](../../frontend/src/components/header.tsx)

Thêm nút tab sau nút "Nhóm" (line ~61):
```tsx
<button onClick={() => setTab('matrix')}
  className={tab === 'matrix' ? active-class : inactive-class}>
  Bảng tổng
</button>
```

Reuse style hiện tại của 2 nút cũ.

## 2.3 Page mới `matrix.tsx`

**File mới:** [frontend/src/pages/matrix.tsx](../../frontend/src/pages/matrix.tsx) (~150 dòng)

```tsx
export function MatrixPage() {
  const { yearMonth, refreshTrigger, setDirty } = useAppStore()
  const [matrix, setMatrix] = useState<TeamMatrix | null>(null)
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [loading, setLoading] = useState(false)

  // Selected cells for multi-select (Set of "userId-day")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focusCell, setFocusCell] = useState<{userId: number, day: number} | null>(null)

  // Load matrix on mount + yearMonth change
  useEffect(() => { loadMatrix() }, [yearMonth, refreshTrigger])

  async function loadMatrix() { /* call GetTeamMonthMatrix + GetWorksites */ }

  async function handleCellSave(userId: number, day: number, coef: number) {
    const date = `${yearMonth}-${String(day).padStart(2,'0')}`
    await UpsertAttendance(userId, date, coef, currentWsId, '')
    setDirty(true)
    loadMatrix() // reload full (simple, performant enough for 100 users)
  }

  async function handleBulkAssignWorksite(wsId: number | null) {
    const cells = Array.from(selected).map(key => {
      const [uid, day] = key.split('-').map(Number)
      return { userId: uid, date: `${yearMonth}-${String(day).padStart(2,'0')}` }
    })
    await BulkUpsertWorksite(cells, wsId)
    setSelected(new Set())
    loadMatrix()
    toast.success(`Đã gán ${cells.length} ô`)
  }

  async function handleDayNoteSave(day: number, note: string) {
    await UpsertDayNote(yearMonth, day, note)
    loadMatrix()
  }

  return (
    <ZoomableArea storageKey="zoom-matrix">
      <MatrixTable
        matrix={matrix}
        worksites={worksites}
        selected={selected}
        focusCell={focusCell}
        onCellSave={handleCellSave}
        onSelect={setSelected}
        onFocusCell={setFocusCell}
        onBulkAssign={handleBulkAssignWorksite}
        onDayNoteSave={handleDayNoteSave}
      />
    </ZoomableArea>
  )
}
```

## 2.4 Component `matrix-table.tsx`

**File mới:** [frontend/src/components/matrix-table.tsx](../../frontend/src/components/matrix-table.tsx) (~180 dòng, sát limit)

Layout HTML:
```tsx
<div className="matrix-container overflow-auto h-full">
  <table className="matrix">
    <thead>
      <tr className="sticky-header-day">
        <th className="sticky-col-name">Tên</th>
        {days.map(d => (
          <th key={d} className="day-header">
            <div>{d}</div>
            <div className="day-weekday">{getWeekdayShort(yearMonth, d)}</div>
          </th>
        ))}
        <th className="sticky-col-total">Tổng</th>
        <th className="sticky-col-total">Lương</th>
      </tr>
      <tr className="sticky-header-note">
        <th className="sticky-col-name bg-muted">Ghi chú</th>
        {days.map(d => (
          <th key={d}><DayNoteCell day={d} note={matrix.dayNotes[d] ?? ''} onSave={onDayNoteSave} /></th>
        ))}
        <th colSpan={2}></th>
      </tr>
    </thead>
    <tbody>
      {matrix.rows.map(row => (
        <tr key={row.userId}>
          <td className="sticky-col-name">{row.userName}</td>
          {days.map(d => (
            <MatrixCell key={`${row.userId}-${d}`}
              userId={row.userId} day={d}
              cell={row.cells[d]}
              worksites={worksites}
              isSelected={selected.has(`${row.userId}-${d}`)}
              isFocused={focusCell?.userId === row.userId && focusCell?.day === d}
              onSave={onCellSave}
              onSelectToggle={...}
              onFocus={onFocusCell}
            />
          ))}
          <td className="sticky-col-total">{row.totalCoef.toFixed(1)}</td>
          <td className="sticky-col-total">{formatMoney(row.salary)}</td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr className="sticky-footer">
        <td className="sticky-col-name">Tổng</td>
        {days.map(d => (
          <td key={d}>{(matrix.dayTotals[d] ?? 0).toFixed(1)}</td>
        ))}
        <td className="sticky-col-total">{grandTotalCoef.toFixed(1)}</td>
        <td className="sticky-col-total">{formatMoney(grandTotalSalary)}</td>
      </tr>
    </tfoot>
  </table>

  {selected.size > 0 && (
    <BulkActionBar count={selected.size} worksites={worksites} onAssign={onBulkAssign} onClear={() => onSelect(new Set())} />
  )}
</div>
```

**Sticky CSS:**
```css
.matrix th.sticky-col-name, .matrix td.sticky-col-name { position: sticky; left: 0; z-index: 2; background: var(--bg-card); }
.matrix th.sticky-col-total, .matrix td.sticky-col-total { position: sticky; right: 0; z-index: 2; background: var(--bg-card); }
.matrix thead tr { position: sticky; top: 0; z-index: 3; background: var(--bg-card); }
.matrix tfoot tr { position: sticky; bottom: 0; z-index: 3; background: var(--bg-card); }
```

**Keyboard nav** — attach ở container, dispatch vào `focusCell`:
- ArrowLeft/Right/Up/Down → move focus cell
- Tab/Shift+Tab → same as Right/Left (wrap row)
- Enter/Shift+Enter → Down/Up
- Number key (0-9, ., ,) → auto-enter edit mode của cell đó
- Esc → blur + clear selection
- Shift+click → range select from last anchor to clicked cell

## 2.5 Component `matrix-cell.tsx`

**File mới:** [frontend/src/components/matrix-cell.tsx](../../frontend/src/components/matrix-cell.tsx) (~120 dòng)

Memoized with `React.memo`. Props stable bằng callback refs ở parent.

```tsx
export const MatrixCell = React.memo(function MatrixCell({userId, day, cell, worksites, isSelected, isFocused, onSave, onSelectToggle, onFocus}) {
  const [editing, setEditing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const coef = cell?.coefficient ?? 0
  const wsColor = cell?.worksiteId ? hashColor(cell.worksiteName) : null

  // When focused via keyboard, auto-scroll into view
  useEffect(() => {
    if (isFocused) inputRef.current?.parentElement?.scrollIntoView({block:'nearest', inline:'nearest'})
  }, [isFocused])

  const handleBlur = (value: string) => {
    const n = parseFloat(value.replace(',','.')) || 0
    if (n !== coef) onSave(userId, day, n, cell?.worksiteId ?? null)
    setEditing(false)
  }

  return (
    <td className={classNames('cell', {selected: isSelected, focused: isFocused, empty: coef === 0})}
        onClick={(e) => {
          if (e.shiftKey) onSelectToggle(userId, day, true) // range
          else if (e.ctrlKey) onSelectToggle(userId, day, false) // toggle single
          else onFocus({userId, day})
        }}
        onDoubleClick={() => setShowPicker(true)}>
      {editing ? (
        <input ref={inputRef} defaultValue={coef || ''} autoFocus
          onBlur={(e) => handleBlur(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleBlur(e.currentTarget.value) }
            if (e.key === 'Escape') { setEditing(false) }
          }}/>
      ) : (
        <>
          <span className="coef">{coef > 0 ? coef : ''}</span>
          {wsColor && <span className="ws-dot" style={{background: wsColor}} title={cell.worksiteName}/>}
        </>
      )}
      {showPicker && <WorksitePickerPopup worksites={worksites} current={cell?.worksiteId}
         onPick={(wsId) => { onSave(userId, day, coef || 1, wsId); setShowPicker(false) }}
         onClose={() => setShowPicker(false)}/>}
    </td>
  )
}, (prev, next) => {
  // Custom compare: only re-render if cell data changed or selection state changed
  return prev.cell === next.cell && prev.isSelected === next.isSelected && prev.isFocused === next.isFocused
})
```

**Perf trick:** Callbacks `onSave`, `onSelectToggle`, `onFocus` phải stable (`useCallback` ở parent với deps ổn định). Nếu không memo useless.

## 2.6 Component `worksite-picker-popup.tsx`

**File mới:** [frontend/src/components/worksite-picker-popup.tsx](../../frontend/src/components/worksite-picker-popup.tsx) (~60 dòng)

Popup nhỏ `position: absolute`, hiện list worksites + 1 nút "Không công trường" + nút "Mới..." (optional phase sau).

- Auto-focus search input (nếu nhiều worksites)
- Close khi click outside hoặc Esc
- Keyboard: arrow up/down chọn, Enter confirm

## 2.7 Component `bulk-action-bar.tsx`

**File mới:** [frontend/src/components/bulk-action-bar.tsx](../../frontend/src/components/bulk-action-bar.tsx) (~50 dòng)

Floating bar phía dưới khi `selected.size > 0`:
```
Đã chọn 5 ô | [Gán công trường ▾] [Xoá chọn]
```

Click "Gán công trường" → mở dropdown giống WorksitePickerPopup nhưng gán hàng loạt.

## 2.8 Component `day-note-cell.tsx`

**File mới:** [frontend/src/components/day-note-cell.tsx](../../frontend/src/components/day-note-cell.tsx) (~40 dòng)

Ô nhỏ trong hàng "Ghi chú":
- Empty → icon `MessageSquare` nhỏ mờ
- Có note → hiện đoạn đầu (ellipsis)
- Click → popover nhỏ textarea, save onBlur

## 2.9 Helpers

**File mới:** [frontend/src/lib/matrix-utils.ts](../../frontend/src/lib/matrix-utils.ts) (~50 dòng)

```ts
export function getDaysInMonth(yearMonth: string): number { /* new Date(year, month, 0).getDate() */ }
export function getWeekdayShort(yearMonth: string, day: number): string { /* 'T2','T3',...,'CN' */ }
export function hashColor(name: string): string { /* HSL hash → fixed color per worksite name */ }
export function formatMoney(n: number): string { /* '1.500.000 ₩' */ }
```

## 2.10 App.tsx — route tab mới

**File sửa:** [frontend/src/App.tsx](../../frontend/src/App.tsx) line 55:

```tsx
{tab === 'personal' ? <PersonalPage /> : tab === 'team' ? <TeamPage /> : <MatrixPage />}
```

## 2.11 Build & test checklist

- [ ] `wails dev` chạy không lỗi
- [ ] Tab "Bảng tổng" render đúng với 0 users (empty state)
- [ ] Tạo 5 test users, chấm công vài ngày → matrix hiện đúng
- [ ] Gõ số vào ô → save, reload → giữ giá trị
- [ ] Double-click → popup công trường mở, chọn → save
- [ ] Shift+click multi-select → bulk assign → tất cả ô cập nhật
- [ ] Arrow keys di chuyển focus đúng
- [ ] Enter xuống dưới, Tab sang phải
- [ ] Gõ số khi chưa edit → auto vào edit mode
- [ ] Sticky header + column hoạt động khi scroll
- [ ] Hàng "Ghi chú" save/load đúng, không lẫn với note per-person
- [ ] Sửa ô ở Bảng tổng → mở tab Nhóm cùng user → thấy đổi
- [ ] Với 30 users × 31 days → scroll mượt, gõ không lag
- [ ] `wails build` OK

## 2.12 Files touched

| File | Action | Est. lines |
|---|---|---|
| `stores/app-store.ts` | Edit | +1 |
| `App.tsx` | Edit | +2 |
| `components/header.tsx` | Edit | +10 |
| `pages/matrix.tsx` | New | ~150 |
| `components/matrix-table.tsx` | New | ~180 |
| `components/matrix-cell.tsx` | New | ~120 |
| `components/worksite-picker-popup.tsx` | New | ~60 |
| `components/bulk-action-bar.tsx` | New | ~50 |
| `components/day-note-cell.tsx` | New | ~40 |
| `lib/matrix-utils.ts` | New | ~50 |
| `style.css` | Edit | +40 (matrix styles) |

**Total:** ~703 dòng mới. Không file nào vượt 200.
