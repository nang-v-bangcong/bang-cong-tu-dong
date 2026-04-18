import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Section {
  title: string
  items: Array<{ keys: string[]; desc: string }>
}

const SECTIONS: Section[] = [
  {
    title: 'Điều hướng',
    items: [
      { keys: ['←', '→', '↑', '↓'], desc: 'Di chuyển ô đang chọn' },
      { keys: ['Tab'], desc: 'Sang ô kế phải (Shift+Tab: sang trái)' },
      { keys: ['Enter'], desc: 'Mở ô để nhập (Shift+Enter: lên trên)' },
      { keys: ['T'], desc: 'Cuộn đến hôm nay' },
    ],
  },
  {
    title: 'Nhập liệu',
    items: [
      { keys: ['0', '–', '9'], desc: '1 ô: mở editor. Nhiều ô: 1-3 áp hệ số, 0 xóa' },
      { keys: ['. , Backspace'], desc: 'Các phím chỉnh sửa số trong editor' },
      { keys: ['Del', 'Backspace'], desc: 'Xóa ô/vùng đã chọn' },
      { keys: ['Escape'], desc: 'Bỏ chọn / đóng editor' },
    ],
  },
  {
    title: 'Chọn nhiều ô',
    items: [
      { keys: ['Shift', '+ Click'], desc: 'Chọn vùng liền kề' },
      { keys: ['Ctrl', '+ Click'], desc: 'Thêm/bớt từng ô' },
      { keys: ['Kéo góc phải-dưới'], desc: 'Điền dải (fill handle)' },
      { keys: ['Double-click'], desc: 'Mở chọn công trường cho ô' },
    ],
  },
  {
    title: 'Chức năng nhanh',
    items: [
      { keys: ['B'], desc: 'Bật/tắt chế độ Cọ' },
      { keys: ['Ctrl', '+ Z'], desc: 'Hoàn tác' },
      { keys: ['Ctrl', '+ Y'], desc: 'Làm lại (hoặc Ctrl+Shift+Z)' },
      { keys: ['Ctrl', '+ C'], desc: 'Copy vùng chọn (TSV, dán Excel)' },
      { keys: ['Ctrl', '+ V'], desc: 'Dán lưới từ Excel' },
      { keys: ['?'], desc: 'Mở/đóng bảng phím tắt này' },
      { keys: ['F1'], desc: 'Mở ghi chú hướng dẫn (có thể in)' },
    ],
  },
  {
    title: 'Menu chuột phải',
    items: [
      { keys: ['Cột ngày'], desc: 'Chấm cả đội, gán CT, copy/lặp ngày, xóa ngày' },
      { keys: ['Tên người'], desc: 'Sửa tên & lương, xuất PDF riêng, xóa' },
    ],
  },
]

export function HelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-h-[85vh] overflow-auto"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-base font-bold">Phím tắt</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="Đóng (Esc)"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--primary)' }}>{s.title}</h3>
              <ul className="space-y-1.5">
                {s.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs">
                    <span className="flex flex-wrap gap-1 shrink-0" style={{ minWidth: 140 }}>
                      {it.keys.map((k, j) => <Kbd key={j}>{k}</Kbd>)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{it.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div
          className="px-5 py-3 text-xs text-center"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          Nhấn <Kbd>Esc</Kbd> hoặc <Kbd>?</Kbd> để đóng
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-block font-mono"
      style={{
        padding: '1px 6px',
        fontSize: 11,
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        color: 'var(--text)',
      }}
    >
      {children}
    </kbd>
  )
}
