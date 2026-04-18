# Phase 8 — Polish: Ctrl+C copy TSV + Help modal + tint alpha

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- Depends on Phases 1–7 hoàn tất (để shortcut list và UI ổn định)

## Overview

- **Date:** 2026-04-18
- **Description:** 3 polish: (C1) Ctrl+C copy vùng ô đã chọn thành TSV vào clipboard để dán Excel. (C2) Help modal shortcuts, trigger nút `?` + `Shift+/`. (C3) Đổi alpha cell tint từ `22` (~13%) → `1a` (~10%) + CSS var tuning.
- **Priority:** Thấp (polish, sau khi core features xong)
- **Implementation status:** Complete (2026-04-19). Commits: 72102d9, 64f90ae, 6933a20, 48f68de. Report: [reports/08-polish.md](./reports/08-polish.md).
- **Review status:** Pending smoke test (user)

## Key Insights

- **C1 scope tối thiểu**: chỉ copy hệ số (coef), không worksite — user xác nhận OK.
- **C1 grid**: tìm bounding box của `selected` set → `(rowMin..rowMax) × (dayMin..dayMax)`. Build matrix string, row sep `\n`, col sep `\t`. Ô trống = `''`.
- **C1 fallback**: `navigator.clipboard.writeText` hỗ trợ WebView2 Windows; fallback bằng ẩn textarea + `document.execCommand('copy')` nếu Promise reject.
- **C2 Help modal**: tách biệt với `help-dialog.tsx` hiện tại (F1). Modal mới tập trung vào shortcut chung cho cả Matrix + Team, triggered bằng nút `?` và `Shift+/`. File `help-modal.tsx`.
- **C3**: chỉ sửa 1 dòng `matrix-cell.tsx:91`, thêm `--ws-tint-alpha` trong `style.css` để future tuning.

## Requirements

**C1:**
- Matrix page keydown Ctrl+C (when `selected.size > 0` và focus không phải input):
  - Tính rowMin, rowMax (theo index filter rows hiện tại), dayMin, dayMax.
  - Loop grid: mỗi row tìm `row.cells?.[day]?.coefficient`, format bằng `formatCoef`. Join cols bằng `\t`, rows bằng `\n`.
  - `await navigator.clipboard.writeText(tsv)` — nếu fail fallback.
  - Toast "Đã copy {selected.size} ô".
- Test: copy 2×3 → paste Excel → ô đúng vị trí.

**C2:**
- Component `components/help-modal.tsx` (< 150 dòng):
  - Fixed overlay, modal trung tâm.
  - Sections với heading:
    - **Điều hướng**: `← → ↑ ↓`, `Tab`, `Enter`.
    - **Nhập liệu**: gõ số, `Delete`, `Escape`.
    - **Chọn nhiều**: `Shift+Click`, `Ctrl+Click`, kéo fill handle.
    - **Chức năng nhanh**: `B` (Cọ), `T` (Hôm nay), `Ctrl+Z/Y`, `Ctrl+C/V`.
    - **Menu**: Right-click ngày (cột), right-click tên người (hàng).
  - Escape đóng.
- Nút `?` hình tròn, trong cả `matrix-toolbar` và `team-toolbar`.
- Keyboard global (hoặc per-page): `Shift+/` khi focus không phải input → mở modal.
- Không mâu thuẫn với F1 (help-dialog cũ): giữ nguyên. Help-modal mới chỉ là shortcut cheatsheet nhanh.

**C3:**
- `matrix-cell.tsx:91`: đổi `'22'` → `'1a'`.
- `frontend/src/style.css`: thêm `:root { --ws-tint-alpha: 0.10; }` (hoặc dark counterpart) — dùng `color-mix` hoặc để comment future.
- Test visual: ô với worksite rõ chữ hơn khi colorOn.

## Architecture

```
lib/use-matrix-copy.ts (mới)
  + useMatrixCopy({ selected, rows, visibleDays }) → install Ctrl+C listener

components/help-modal.tsx (mới, < 150 dòng)
  + props: open, onClose
  + static content Vietnamese

matrix-toolbar.tsx, team-toolbar.tsx
  + nút `?` (HelpCircle icon)
  + prop onHelpClick

matrix.tsx, team.tsx
  + state showHelp, keyboard Shift+/ listener
  + render <HelpModal open={showHelp} onClose={...} />

matrix-cell.tsx (C3: 1-line change)
style.css (C3: --ws-tint-alpha var)
```

## Related code files

- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-cell.tsx:91`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/style.css`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/matrix.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/pages/team.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/matrix-toolbar.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/team-toolbar.tsx`
- `d:/Dự án gốc/Bảng công tự động/frontend/src/lib/use-matrix-paste.ts` (reference pattern cho Ctrl+V, dùng tương tự cho Ctrl+C)
- `d:/Dự án gốc/Bảng công tự động/frontend/src/components/help-dialog.tsx` (reference UI khác, không đụng)

## Implementation Steps

1. **C3 (trivial)**:
   - `matrix-cell.tsx:91`: `hashColor(wsName) + '22'` → `hashColor(wsName) + '1a'`.
   - `style.css`: thêm `:root { --ws-tint-alpha: 0.10; }` (documented cho future tuning).
   - Visual verify: bật "Màu ô" → ô nhạt hơn, chữ dễ đọc.
2. **C1 Ctrl+C**:
   - Tạo `lib/use-matrix-copy.ts`:
     ```ts
     interface Opts {
       selected: Set<string>    // from useMatrixSelection
       rows: MatrixRow[]        // filtered+sorted rows (matches UI order)
     }
     export function useMatrixCopy({ selected, rows }: Opts) {
       useEffect(() => {
         const onKey = async (e: KeyboardEvent) => {
           if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return
           const t = e.target as HTMLElement
           if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
           if (selected.size === 0) return
           e.preventDefault()
           // Parse keys → bbox
           const pts = Array.from(selected).map(parseCellKey)
           const userIds = Array.from(new Set(pts.map(p => p.userId)))
           const rowIndexMap = new Map(rows.map((r, i) => [r.userId, i]))
           const rowIndexes = userIds.map(u => rowIndexMap.get(u) ?? -1).filter(i => i >= 0).sort((a,b)=>a-b)
           const dayMin = Math.min(...pts.map(p => p.day))
           const dayMax = Math.max(...pts.map(p => p.day))
           const lines: string[] = []
           for (const ri of rowIndexes) {
             const r = rows[ri]
             const cols: string[] = []
             for (let d = dayMin; d <= dayMax; d++) {
               const c = r.cells?.[d]
               cols.push(c && c.coefficient ? formatCoef(c.coefficient) : '')
             }
             lines.push(cols.join('\t'))
           }
           const tsv = lines.join('\n')
           try { await navigator.clipboard.writeText(tsv) }
           catch { fallbackCopy(tsv) }
           toast.success(`Đã copy ${selected.size} ô`)
         }
         window.addEventListener('keydown', onKey)
         return () => window.removeEventListener('keydown', onKey)
       }, [selected, rows])
     }
     function fallbackCopy(s: string) {
       const ta = document.createElement('textarea')
       ta.value = s; ta.style.position='fixed'; ta.style.opacity='0'
       document.body.appendChild(ta); ta.select()
       document.execCommand('copy'); document.body.removeChild(ta)
     }
     ```
   - `matrix-table.tsx`: `useMatrixCopy({ selected, rows })`.
   - Decision: **chỉ copy các hàng có cell được chọn** (không phải toàn bounding-box rows giữa). Note: bbox đơn giản hơn, user đã chọn vùng liên tiếp thông thường. Nếu user Ctrl+click rải rác → vẫn build bbox (cell không chọn trong bbox vẫn xuất giá trị hiện tại) — acceptable, giống Excel behavior.
3. **C2 Help modal**:
   - Tạo `help-modal.tsx`:
     ```tsx
     interface Props { open: boolean; onClose: () => void }
     export function HelpModal({ open, onClose }: Props) {
       useEffect(() => {
         if (!open) return
         const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
         window.addEventListener('keydown', onKey)
         return () => window.removeEventListener('keydown', onKey)
       }, [open, onClose])
       if (!open) return null
       return (
         <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
           <div onClick={(e) => e.stopPropagation()}
                className="w-[520px] max-h-[80vh] overflow-auto p-5"
                style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
             <h2 className="text-lg font-bold mb-3">Phím tắt</h2>
             {/* Sections... */}
             <button onClick={onClose} className="mt-4 ...">Đóng (Esc)</button>
           </div>
         </div>
       )
     }
     ```
   - Sections render từ data object (dễ maintain).
   - `matrix-toolbar.tsx` + `team-toolbar.tsx`: thêm nút tròn `?` (HelpCircle icon).
   - `matrix.tsx` + `team.tsx`: state + keyboard `Shift+/` listener + mount modal.
4. **Smoke test:**
   - Chọn 2×3 ô matrix → Ctrl+C → paste Notepad → TSV đúng.
   - Paste Excel → 2×3 cells.
   - Nút `?` + Shift+/ mở modal. Esc đóng.
   - Cell tint nhẹ hơn khi bật màu.

## Todo list

- [x] C3: đổi alpha + thêm CSS var.
- [x] C1: tạo `use-matrix-copy.ts` + hook vào matrix-table.
- [ ] C1: test copy → paste Excel thực tế. (user smoke test)
- [x] C2: tạo `help-modal.tsx` với content đầy đủ tiếng Việt.
- [x] C2: thêm nút `?` trong 2 toolbar + keyboard `Shift+/` listener cả 2 page.
- [x] Vitest pass (119/119). `wails build`: chờ user reset wails dev.

## Success Criteria

- [ ] Ctrl+C với vùng chọn → clipboard chứa TSV → Excel paste thành grid.
- [ ] Ctrl+C khi đang edit trong input → không trigger.
- [ ] Shift+/ mở Help modal; Esc đóng.
- [ ] Nút `?` ở cả 2 toolbar mở cùng modal.
- [ ] Cell tint rõ ràng hơn, không làm mờ chữ.
- [ ] Không regression test cũ.
- [ ] Không file > 200 dòng.

## Risk Assessment

- **Thấp (C1)**: clipboard API hỗ trợ WebView2. Fallback có sẵn.
- **Thấp (C2)**: nội dung tĩnh.
- **Thấp (C3)**: 1-line CSS.

## Security Considerations

- C1 không ghi dữ liệu ra ngoài app (chỉ clipboard user chủ động). OK.

## Next steps

Kết thúc phase. Ship → QA với user. Cập nhật `docs/user-guide.md` với shortcut mới và tính năng mới.
