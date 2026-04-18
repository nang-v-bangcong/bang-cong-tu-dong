import { useRef, useState } from 'react'
import { Building2, X } from 'lucide-react'
import { type Worksite } from '../lib/utils'
import { formatCoef, listSundays } from '../lib/matrix-utils'
import { WorksitePickerPopup } from './worksite-picker-popup'

interface Props {
  yearMonth: string
  worksites: Worksite[]
  onConfirm: (coef: number, wsId: number | null, overwrite: boolean) => void
  onCancel: () => void
}

const COEF_PRESETS = [0.5, 1, 1.5, 2]

export function FillSundaysDialog({ yearMonth, worksites, onConfirm, onCancel }: Props) {
  const [coef, setCoef] = useState<number>(1)
  const [wsId, setWsId] = useState<number | null>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [showWsPicker, setShowWsPicker] = useState(false)
  const [wsAnchor, setWsAnchor] = useState<{ top: number; left: number }>()
  const wsBtnRef = useRef<HTMLButtonElement>(null)

  const sundays = listSundays(yearMonth)
  const wsName = wsId ? worksites.find((w) => w.id === wsId)?.name ?? '' : ''
  const invalid = coef <= 0 || coef > 3 || sundays.length === 0

  const openWsPicker = () => {
    const r = wsBtnRef.current?.getBoundingClientRect()
    if (r) setWsAnchor({ top: r.bottom + 2, left: r.left })
    setShowWsPicker(true)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onCancel}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] p-6"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h3 className="text-base font-bold mb-3">Chấm tất cả Chủ nhật</h3>

        <label className="text-xs font-semibold block mb-1">Hệ số</label>
        <div className="flex items-center gap-1 mb-1">
          {COEF_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setCoef(c)}
              className="flex-1 px-2 py-1.5 text-xs"
              style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: coef === c ? 'var(--primary)' : 'transparent',
                color: coef === c ? '#fff' : undefined,
                fontWeight: coef === c ? 600 : 400,
              }}
            >
              {formatCoef(c)}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0.1}
          max={3}
          step={0.1}
          value={coef}
          onChange={(e) => setCoef(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-1.5 mb-3 text-sm"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}
        />

        <label className="text-xs font-semibold block mb-1">Công trường (tùy chọn)</label>
        <button
          ref={wsBtnRef}
          onClick={openWsPicker}
          className="w-full flex items-center gap-1.5 px-2 py-2 text-xs mb-3"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          <Building2 size={12} /> {wsName ? wsName : 'Chọn công trường...'}
          {wsId && (
            <X size={11} className="ml-auto" onClick={(e) => { e.stopPropagation(); setWsId(null) }} />
          )}
        </button>

        <label className="flex items-center gap-2 text-xs cursor-pointer mb-3">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          <span>Ghi đè ô đã có</span>
        </label>

        <div className="text-xs mb-4 p-2" style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Các Chủ nhật: </span>
          <span className="font-semibold">
            {sundays.length > 0 ? sundays.map((d) => `CN ${d}`).join(', ') : 'không có'}
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button
            disabled={invalid}
            onClick={() => onConfirm(coef, wsId, overwrite)}
            className="flex-1 py-2 text-white text-sm font-semibold rounded-[var(--radius)] disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >Chấm {sundays.length} CN</button>
        </div>
      </div>

      {showWsPicker && (
        <WorksitePickerPopup
          worksites={worksites}
          current={wsId}
          anchor={wsAnchor}
          onPick={(id) => { setWsId(id); setShowWsPicker(false) }}
          onClose={() => setShowWsPicker(false)}
        />
      )}
    </div>
  )
}
