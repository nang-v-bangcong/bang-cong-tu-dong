import { UserPlus, Search, X, Paintbrush, Download } from 'lucide-react'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  onAddClick: () => void
  cellColorOn: boolean
  onToggleCellColor: () => void
  sortBy: 'name' | 'days' | 'salary'
  sortDir: 'asc' | 'desc'
  onSortChange: (by: 'name' | 'days' | 'salary', dir: 'asc' | 'desc') => void
  onExportExcel: () => void
  onExportPDF: () => void
}

const SORT_OPTIONS: Array<{ key: 'name' | 'days' | 'salary'; label: string }> = [
  { key: 'name', label: 'Tên' },
  { key: 'days', label: 'Số công' },
  { key: 'salary', label: 'Lương' },
]

export function MatrixToolbar({
  search, onSearchChange, onAddClick,
  cellColorOn, onToggleCellColor,
  sortBy, sortDir, onSortChange,
  onExportExcel, onExportPDF,
}: Props) {
  return (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      <button
        onClick={onAddClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white"
        style={{ background: 'var(--primary)', borderRadius: 'var(--radius)' }}
      >
        <UserPlus size={14} /> Thêm người
      </button>

      <div className="relative flex items-center" style={{ width: 240 }}>
        <Search size={13} className="absolute left-2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tên..."
          className="w-full pl-7 pr-7 py-1.5 text-xs bg-transparent"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="absolute right-1.5">
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Sắp xếp:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any, sortDir)}
          className="px-1.5 py-0.5 text-xs bg-transparent"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button
          onClick={() => onSortChange(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-0.5 text-xs"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          title={sortDir === 'asc' ? 'Tăng dần' : 'Giảm dần'}
        >
          {sortDir === 'asc' ? '▲' : '▼'}
        </button>
      </div>

      <button
        onClick={onToggleCellColor}
        className="flex items-center gap-1 px-2 py-1 text-xs"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: cellColorOn ? 'var(--primary)' : 'transparent',
          color: cellColorOn ? '#fff' : undefined,
        }}
        title="Bật/tắt tô màu ô"
      >
        <Paintbrush size={12} /> {cellColorOn ? 'Màu ô: BẬT' : 'Màu ô: TẮT'}
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onExportExcel}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          <Download size={12} /> Excel
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center gap-1 px-2.5 py-1 text-xs"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          <Download size={12} /> PDF
        </button>
      </div>
    </div>
  )
}
