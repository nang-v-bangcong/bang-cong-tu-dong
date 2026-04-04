import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../stores/app-store'

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

export function MonthPicker() {
  const { yearMonth, setYearMonth } = useAppStore()
  const [year, month] = yearMonth.split('-').map(Number)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (delta: number) => {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setYearMonth(`${y}-${String(m).padStart(2, '0')}`)
  }

  const pick = (m: number) => {
    setYearMonth(`${pickerYear}-${String(m).padStart(2, '0')}`)
    setShowPicker(false)
  }

  const navBtn = 'p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors'

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1">
        <button onClick={() => go(-1)} className={navBtn}>
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => { setPickerYear(year); setShowPicker(!showPicker) }}
          className="text-sm font-bold min-w-[120px] text-center px-2 py-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          Tháng {month}, {year}
        </button>
        <button onClick={() => go(1)} className={navBtn}>
          <ChevronRight size={16} />
        </button>
      </div>

      {showPicker && (
        <div
          className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 p-2.5 z-50 w-[210px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setPickerYear(pickerYear - 1)} className={navBtn}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold">{pickerYear}</span>
            <button onClick={() => setPickerYear(pickerYear + 1)} className={navBtn}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((name, i) => {
              const active = pickerYear === year && i + 1 === month
              return (
                <button
                  key={i}
                  onClick={() => pick(i + 1)}
                  className={`py-1.5 text-[11px] font-medium transition-colors ${active ? 'text-white' : 'hover:bg-[var(--bg-hover)]'}`}
                  style={active ? { background: 'var(--primary)', borderRadius: 'var(--radius-sm)' } : { borderRadius: 'var(--radius-sm)' }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
