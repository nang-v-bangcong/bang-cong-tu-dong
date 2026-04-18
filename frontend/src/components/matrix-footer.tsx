import { useEffect, useState } from 'react'
import { formatWon } from '../lib/utils'
import { hashBg, hashColor, type WsBreakdownItem } from '../lib/matrix-utils'

const STORAGE_KEY = 'matrix-ws-breakdown-open'

interface Props {
  days: number[]
  dayTotals: Record<number, number>
  grandTotalCoef: number
  grandTotalSalary: number
  breakdown: WsBreakdownItem[]
  stickyLeft: React.CSSProperties
  stickyRight: React.CSSProperties
}

export function MatrixFooter({ days, dayTotals, grandTotalCoef, grandTotalSalary, breakdown, stickyLeft, stickyRight }: Props) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  useEffect(() => { localStorage.setItem(STORAGE_KEY, String(open)) }, [open])

  const colSpan = days.length + 3

  return (
    <tfoot>
      <tr style={{ position: 'sticky', bottom: 0, zIndex: 3, background: 'var(--bg-muted)' }}>
        <td style={{ ...stickyLeft, background: 'var(--bg-muted)', padding: '4px 8px', fontWeight: 700, bottom: 0 }}>Tổng</td>
        {days.map((d) => (
          <td key={d} style={{ padding: '4px 2px', textAlign: 'center', fontSize: 10, borderRight: '1px solid var(--border-light)' }}>
            {(dayTotals[d] ?? 0).toFixed(1)}
          </td>
        ))}
        <td style={{ ...stickyRight, background: 'var(--bg-muted)', right: 100, padding: '4px 8px', textAlign: 'center', fontWeight: 700, bottom: 0 }}>{grandTotalCoef.toFixed(1)}</td>
        <td style={{ ...stickyRight, background: 'var(--bg-muted)', right: 0, padding: '4px 8px', textAlign: 'right', fontWeight: 700, bottom: 0 }}>{formatWon(grandTotalSalary)}</td>
      </tr>
      {breakdown.length > 0 && (
        <tr>
          <td colSpan={colSpan} style={{ padding: '4px 8px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              {open ? '▾' : '▸'} Theo công trường ({breakdown.length})
            </button>
            {open && (
              <div className="flex flex-wrap gap-1 mt-1">
                {breakdown.map((b) => {
                  const isUnassigned = b.wsId == null
                  const bg = isUnassigned ? 'var(--bg-card)' : hashBg(b.wsName, 0.1)
                  const border = isUnassigned ? 'var(--border)' : hashColor(b.wsName)
                  return (
                    <span
                      key={b.wsId ?? 'unassigned'}
                      style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '2px 6px', fontSize: 11 }}
                    >
                      <strong>{b.wsName}</strong>: {b.totalCoef.toFixed(1)} công · {formatWon(b.totalSalary)}
                    </span>
                  )
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </tfoot>
  )
}
