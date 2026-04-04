import { formatWon } from '../lib/utils'
import { Trophy } from 'lucide-react'

interface PersonSummary {
  userId: number
  name: string
  dailyWage: number
  totalDays: number
  totalCoefficient: number
  totalSalary: number
  totalAdvances: number
  netSalary: number
}

interface Props {
  data: PersonSummary[]
}

export function TeamSummary({ data }: Props) {
  const grandTotal = data.reduce((sum, p) => sum + p.netSalary, 0)
  const sorted = [...data].sort((a, b) => b.totalCoefficient - a.totalCoefficient)

  return (
    <div className="space-y-3">
      <div className="p-3 flex items-center justify-between"
        style={{ background: 'var(--primary-soft)', borderRadius: 'var(--radius)' }}>
        <span className="text-sm font-medium">Tổng lương phải trả</span>
        <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatWon(grandTotal)}</span>
      </div>

      <div className="overflow-auto" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            <tr>
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2 text-center">Ngày</th>
              <th className="px-3 py-2 text-center">Hệ số</th>
              <th className="px-3 py-2 text-right">Lương</th>
              <th className="px-3 py-2 text-right">Tạm ứng</th>
              <th className="px-3 py-2 text-right">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.userId} className="hover:bg-[var(--bg-hover)]"
                style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-3 py-2">
                  {i === 0 ? <Trophy size={14} style={{ color: 'var(--warning)' }} /> : i + 1}
                </td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-center">{p.totalDays}</td>
                <td className="px-3 py-2 text-center">{p.totalCoefficient.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">{formatWon(p.totalSalary)}</td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--orange)' }}>{formatWon(p.totalAdvances)}</td>
                <td className="px-3 py-2 text-right font-medium"
                  style={{ color: p.netSalary < 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatWon(p.netSalary)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
