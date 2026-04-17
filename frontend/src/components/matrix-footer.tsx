import { formatWon } from '../lib/utils'

interface Props {
  days: number[]
  dayTotals: Record<number, number>
  grandTotalCoef: number
  grandTotalSalary: number
  stickyLeft: React.CSSProperties
  stickyRight: React.CSSProperties
}

export function MatrixFooter({ days, dayTotals, grandTotalCoef, grandTotalSalary, stickyLeft, stickyRight }: Props) {
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
    </tfoot>
  )
}
