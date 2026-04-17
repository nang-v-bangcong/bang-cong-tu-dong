# Phase 4: Help Dialog

**Thời gian ước tính:** 2-3 giờ
**Dependencies:** Phase 2 (Tab Bảng tổng đã có, để biết nội dung gì cần hướng dẫn)
**Output:** Nút "Hướng dẫn" trong header + F1 + modal in-app cho 3 tab
**Status:** ✅ DONE (2026-04-17)

---

## 4.1 Component `help-button.tsx`

**File mới:** [frontend/src/components/help-button.tsx](../../frontend/src/components/help-button.tsx) (~40 dòng)

```tsx
import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { HelpDialog } from './help-dialog'

export function HelpButton() {
  const { tab } = useAppStore()
  const [open, setOpen] = useState(false)

  // F1 keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button onClick={() => setOpen(true)} title="Hướng dẫn (F1)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors"
        style={{ borderRadius: 'var(--radius-sm)' }}>
        <HelpCircle size={14} />
        <span>Hướng dẫn</span>
      </button>
      {open && <HelpDialog tab={tab} onClose={() => setOpen(false)} />}
    </>
  )
}
```

## 4.2 Component `help-dialog.tsx`

**File mới:** [frontend/src/components/help-dialog.tsx](../../frontend/src/components/help-dialog.tsx) (~90 dòng)

```tsx
import { useEffect } from 'react'
import { X, Printer } from 'lucide-react'
import { HelpContentPersonal } from './help-content/personal'
import { HelpContentTeam } from './help-content/team'
import { HelpContentMatrix } from './help-content/matrix'

interface Props { tab: 'personal' | 'team' | 'matrix'; onClose: () => void }

const TITLES = { personal: 'Tab Cá nhân', team: 'Tab Nhóm', matrix: 'Tab Bảng tổng' }

export function HelpDialog({ tab, onClose }: Props) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const Content = { personal: HelpContentPersonal, team: HelpContentTeam, matrix: HelpContentMatrix }[tab]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:static"
         style={{ background: 'rgba(0,0,0,0.5)' }}
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="help-dialog bg-[var(--bg-card)] max-w-3xl w-full max-h-[90vh] overflow-auto print:max-w-full print:max-h-full print:shadow-none"
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <header className="flex items-center justify-between p-4 border-b sticky top-0 print:hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h2 className="font-semibold">Hướng dẫn — {TITLES[tab]}</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} title="In (Ctrl+P)"
              className="p-1.5 hover:bg-[var(--bg-hover)]" style={{ borderRadius: 'var(--radius-sm)' }}>
              <Printer size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg-hover)]" style={{ borderRadius: 'var(--radius-sm)' }}>
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="p-6 help-content">
          <Content />
        </div>
      </div>
    </div>
  )
}
```

## 4.3 Content Components

### `help-content/personal.tsx`

**File mới:** [frontend/src/components/help-content/personal.tsx](../../frontend/src/components/help-content/personal.tsx) (~70 dòng)

4 section JSX:

```tsx
export function HelpContentPersonal() {
  return (
    <>
      <section>
        <h3>Tổng quan</h3>
        <p>Tab Cá nhân giúp anh theo dõi công và lương của riêng mình theo từng tháng. Mỗi ngày anh chấm 1 lần, hệ thống tự tính tổng công, tổng lương, trừ tạm ứng.</p>
      </section>
      <section>
        <h3>Các thao tác cơ bản</h3>
        <ul>
          <li><b>Chọn tháng:</b> bấm vào tháng/năm ở Header để xem tháng khác.</li>
          <li><b>Chấm công:</b> bấm "Chấm công hôm nay" hoặc click vào ngày trong bảng, nhập hệ số (1 = 1 công, 0.5 = nửa công, 1.5 = công rưỡi).</li>
          <li><b>Chọn công trường:</b> mỗi ngày có thể gán 1 công trường khác nhau.</li>
          <li><b>Ghi chú:</b> thêm note cho ngày cụ thể (vd: "về sớm", "tăng ca").</li>
          <li><b>Tạm ứng:</b> panel bên phải để ghi lại các lần anh nhận tiền trước trong tháng.</li>
          <li><b>Xuất PDF:</b> bấm "Xuất PDF" để lưu bảng công tháng này.</li>
        </ul>
      </section>
      <section>
        <h3>Phím tắt & mẹo</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + lăn chuột → phóng to/thu nhỏ bảng công.</li>
          <li><kbd>F1</kbd> → mở hướng dẫn (đang xem).</li>
          <li><kbd>Tab</kbd> / <kbd>Enter</kbd> → di chuyển giữa các ô.</li>
          <li>Sao chép ngày trước: bấm "Copy ngày trước" để lặp lại chấm công gần nhất.</li>
        </ul>
      </section>
      <section>
        <h3>Câu hỏi thường gặp</h3>
        <dl>
          <dt>Hệ số là gì?</dt>
          <dd>Là số công của ngày đó. 1 = nguyên ngày, 0.5 = nửa ngày, 1.5 = có tăng ca... Hệ số × lương ngày công trường = tiền ngày đó.</dd>
          <dt>Quên chấm ngày cũ thì sao?</dt>
          <dd>Click vào ô ngày đó trong bảng, nhập bình thường. Không bắt buộc chấm theo thứ tự.</dd>
          <dt>Công chưa có tiền là gì?</dt>
          <dd>Là công ở công trường chưa nhập đơn giá (daily_wage = 0). Vẫn tính vào tổng công nhưng không cộng vào lương.</dd>
        </dl>
      </section>
    </>
  )
}
```

### `help-content/team.tsx`

**File mới:** [frontend/src/components/help-content/team.tsx](../../frontend/src/components/help-content/team.tsx) (~70 dòng)

Structure tương tự. Key points:
- Tổng quan: quản lý nhiều người, chọn từng người xem chi tiết, sidebar hiện tổng kết team
- Thao tác: thêm người, chấm công nhóm (batch), xem từng người, xuất PDF
- Mẹo: khác gì với Bảng tổng (tab này = xem chi tiết từng người; Bảng tổng = xem ma trận cả team)
- FAQ: khi nào dùng tab này vs Bảng tổng, xoá người có mất data không (có → confirm)

### `help-content/matrix.tsx`

**File mới:** [frontend/src/components/help-content/matrix.tsx](../../frontend/src/components/help-content/matrix.tsx) (~90 dòng)

Nội dung dài nhất vì nhiều thao tác mới:
- Tổng quan: bảng Excel tổng cả team × cả tháng, phù hợp nhập liệu nhanh hàng ngày
- Thao tác:
  - Gõ số vào ô → nhập hệ số
  - Double-click ô → chọn công trường
  - Shift+click / Ctrl+click → chọn nhiều ô
  - Khi có ô chọn, thanh dưới cùng hiện "Gán công trường" → gán 1 phát nhiều ô
  - Hàng "Ghi chú" dưới ngày → ghi chú chung cho ngày đó
- Phím tắt:
  - Arrow / Tab / Enter → di chuyển ô
  - Gõ số khi đang ở ô → auto vào edit mode
  - Esc → huỷ chọn / huỷ edit
  - Ctrl+wheel → zoom (điểm dưới chuột giữ nguyên)
- FAQ:
  - Sửa ở Bảng tổng có ảnh hưởng tab Nhóm không? → Có, cùng data.
  - Ghi chú ngày khác ghi chú cá nhân? → Có, ghi chú ngày là chung cho cả team, ghi chú cá nhân nằm ở tab Cá nhân/Nhóm.
  - In bảng này ra giấy? → Chưa hỗ trợ, dùng tab Cá nhân/Nhóm xuất PDF từng người.
  - Zoom lưu ở đâu? → localStorage, giữ khi mở lại app.

## 4.4 CSS cho help content

**File sửa:** [frontend/src/style.css](../../frontend/src/style.css)

Thêm:
```css
.help-content h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--primary);
}
.help-content section:first-child h3 { margin-top: 0; }
.help-content p, .help-content li, .help-content dd { font-size: 0.9rem; line-height: 1.5; color: var(--text); }
.help-content ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
.help-content li { margin-bottom: 0.3rem; }
.help-content dt { font-weight: 600; margin-top: 0.5rem; }
.help-content dd { margin-left: 1rem; color: var(--text-secondary); }
.help-content kbd {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.75rem;
  font-family: monospace;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: 3px;
}

/* Print styles */
@media print {
  body * { visibility: hidden; }
  .help-dialog, .help-dialog * { visibility: visible; }
  .help-dialog { position: absolute; left: 0; top: 0; width: 100%; }
  .help-content { padding: 2rem; }
  .help-content h3 { color: #000; page-break-after: avoid; }
  .help-content section { page-break-inside: avoid; }
}
```

## 4.5 Header — gắn nút

**File sửa:** [frontend/src/components/header.tsx](../../frontend/src/components/header.tsx)

Thêm `<HelpButton />` trước `<ThemeToggle />` (line ~84).

## 4.6 Build & test checklist

- [ ] Nút "Hướng dẫn" xuất hiện ở header
- [ ] Click nút → modal mở với nội dung đúng tab đang xem
- [ ] Đổi tab → đóng modal → mở lại → nội dung đổi theo
- [ ] F1 mở modal
- [ ] Esc đóng modal
- [ ] Click backdrop đóng modal
- [ ] Nút In: `window.print()` → preview in sạch (không header app, không backdrop)
- [ ] Dark mode: modal tự đổi màu, text dễ đọc
- [ ] Modal scroll khi nội dung dài, header modal sticky
- [ ] Modal responsive ở window hẹp

## 4.7 Files touched

| File | Action | Est. lines |
|---|---|---|
| `components/help-button.tsx` | New | ~40 |
| `components/help-dialog.tsx` | New | ~90 |
| `components/help-content/personal.tsx` | New | ~70 |
| `components/help-content/team.tsx` | New | ~70 |
| `components/help-content/matrix.tsx` | New | ~90 |
| `components/header.tsx` | Edit | +2 |
| `style.css` | Edit | +40 |

**Total:** ~400 dòng mới. Không file nào vượt 200.

## 4.8 Không làm (YAGNI)

- ❌ Markdown lib — viết JSX thẳng đủ.
- ❌ Video tutorial / GIF — sau nếu cần.
- ❌ Tooltip onboarding lần đầu mở app — user nhiều ≠ mới, skip.
- ❌ Multi-language — app tiếng Việt 100%.
- ❌ Search trong modal — Ctrl+F của browser đủ.
