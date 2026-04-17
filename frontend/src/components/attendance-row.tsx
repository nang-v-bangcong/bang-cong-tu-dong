import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { type Worksite, formatDay, getDayOfWeek } from '../lib/utils'
import { useAppStore } from '../stores/app-store'

interface AttendanceData {
  id?: number
  date: string
  coefficient: number
  worksiteId: number | null
  note: string
}

interface Props {
  date: string
  data: AttendanceData | null
  worksites: Worksite[]
  isToday: boolean
  onSave: (date: string, coeff: number, worksiteId: number | null, note: string) => void
  onDelete: (id: number) => void
}

export function AttendanceRow({ date, data, worksites, isToday, onSave, onDelete }: Props) {
  const [coeff, setCoeff] = useState(data?.coefficient ?? 0)
  const [wsId, setWsId] = useState<number | null>(data?.worksiteId ?? null)
  const [note, setNote] = useState(data?.note ?? '')
  const dirty = useRef(false)
  const setGlobalDirty = useAppStore((s) => s.setDirty)

  const day = formatDay(date)
  const dow = getDayOfWeek(date)
  const isSunday = dow === 'CN'

  const save = () => {
    if (!dirty.current) return
    if (coeff > 0) {
      onSave(date, coeff, wsId, note)
    } else if (data?.id) {
      onDelete(data.id)
    }
    dirty.current = false
    setGlobalDirty(false)
  }

  const handleCoeffChange = (val: string) => {
    setCoeff(Number(val))
    dirty.current = true
    setGlobalDirty(true)
  }

  const handleWsChange = (val: string) => {
    const newWsId = val ? Number(val) : null
    setWsId(newWsId)
    const c = coeff > 0 ? coeff : 1
    setCoeff(c)
    setGlobalDirty(true)
    onSave(date, c, newWsId, note)
    dirty.current = false
    setGlobalDirty(false)
  }

  const rowBg = isToday
    ? 'var(--primary-soft)'
    : isSunday
      ? 'var(--danger-soft)'
      : undefined

  const cellBorder = { borderRight: '1px solid var(--border-light)' }
  const inputCls = 'w-full px-1 py-0.5 text-xs text-center border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] rounded-[var(--radius-sm)] bg-transparent'

  return (
    <tr
      style={{ background: rowBg, borderBottom: '1px solid var(--border-light)' }}
      className={`hover:bg-[var(--bg-hover)] ${isSunday ? 'text-[var(--danger)]' : ''}`}
    >
      <td style={cellBorder} className="px-1.5 py-1 text-center text-xs font-semibold">{day}</td>
      <td style={{ ...cellBorder, color: 'var(--text-muted)' }} className="px-1 py-1 text-center text-[10px] w-[24px]">{dow}</td>
      <td style={cellBorder} className="px-0.5 py-0.5 w-[50px]">
        <input
          type="number"
          step="0.1"
          min="0"
          value={coeff || ''}
          onChange={(e) => handleCoeffChange(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="-"
          className={inputCls}
        />
      </td>
      <td style={cellBorder} className="px-0.5 py-0.5">
        <select
          value={wsId ?? ''}
          onChange={(e) => handleWsChange(e.target.value)}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="">--</option>
          {worksites.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </td>
      <td style={cellBorder} className="px-0.5 py-0.5">
        <input
          value={note}
          onChange={(e) => { setNote(e.target.value); dirty.current = true; setGlobalDirty(true) }}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={inputCls}
        />
      </td>
      <td className="px-0.5 py-0.5 w-[24px]">
        {data?.id && (
          <button onClick={() => onDelete(data.id!)} className="p-0.5 opacity-30 hover:opacity-100 hover:text-[var(--danger)] transition-opacity">
            <Trash2 size={12} />
          </button>
        )}
      </td>
    </tr>
  )
}
