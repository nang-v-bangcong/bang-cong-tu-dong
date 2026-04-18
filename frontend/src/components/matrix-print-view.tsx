import { type models } from '../../wailsjs/go/models'
import { isSundayOf, getWeekdayShort, type WsBreakdownItem } from '../lib/matrix-utils'
import { formatWon } from '../lib/utils'

interface Props {
  matrix: models.TeamMatrix
  breakdown: WsBreakdownItem[]
}

// Absolutely hidden on screen; revealed only by print media query.
export function MatrixPrintView({ matrix, breakdown }: Props) {
  const { yearMonth, daysInMonth, rows, dayNotes, dayTotals } = matrix
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const grandTotalCoef = rows.reduce((s, r) => s + r.totalCoef, 0)
  const grandTotalSalary = rows.reduce((s, r) => s + r.salary, 0)

  return (
    <div className="matrix-print-container">
      <h2 className="matrix-print-title">Bảng công tháng {yearMonth}</h2>
      <table className="matrix-print-table">
        <thead>
          <tr>
            <th>Tên</th>
            {days.map((d) => (
              <th key={d} className={isSundayOf(yearMonth, d) ? 'sunday-col' : ''}>
                <div>{d}</div>
                <div className="wk">{getWeekdayShort(yearMonth, d)}</div>
              </th>
            ))}
            <th>Công</th>
            <th>Lương</th>
          </tr>
          <tr className="note-row">
            <th>Ghi chú</th>
            {days.map((d) => (
              <th key={d} className={isSundayOf(yearMonth, d) ? 'sunday-col' : ''}>
                {dayNotes?.[d] ?? ''}
              </th>
            ))}
            <th colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId}>
              <td className="name-cell">{row.userName}</td>
              {days.map((d) => {
                const c = row.cells?.[d]
                const val = c && c.coefficient !== 0 ? c.coefficient.toString() : ''
                return (
                  <td key={d} className={isSundayOf(yearMonth, d) ? 'sunday-col cell' : 'cell'}>
                    {val}
                  </td>
                )
              })}
              <td className="total">{row.totalCoef.toFixed(1)}</td>
              <td className="salary">{formatWon(row.salary)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Tổng</th>
            {days.map((d) => (
              <th key={d} className={isSundayOf(yearMonth, d) ? 'sunday-col' : ''}>
                {(dayTotals?.[d] ?? 0).toFixed(1)}
              </th>
            ))}
            <th className="total">{grandTotalCoef.toFixed(1)}</th>
            <th className="salary">{formatWon(grandTotalSalary)}</th>
          </tr>
        </tfoot>
      </table>
      {breakdown.length > 0 && (
        <div className="matrix-print-breakdown">
          <h3>Theo công trường</h3>
          <table>
            <thead>
              <tr><th>Công trường</th><th>Công</th><th>Lương</th></tr>
            </thead>
            <tbody>
              {breakdown.map((b) => (
                <tr key={b.wsId ?? 'unassigned'}>
                  <td>{b.wsName}</td>
                  <td className="total">{b.totalCoef.toFixed(1)}</td>
                  <td className="total">{formatWon(b.totalSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
