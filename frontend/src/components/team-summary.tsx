import { formatWon } from '../lib/utils'
import { Trophy } from 'lucide-react'

interface PersonSummary {
  userId: number
  name: string
  totalDays: number
  totalCoefficient: number
  totalSalary: number
  totalAdvances: number
  netSalary: number
  paidDays: number
  paidCoefficient: number
  unpaidDays: number
  unpaidCoefficient: number
}

interface Props {
  data: PersonSummary[]
}

export function TeamSummary({ data }: Props) {
  const grandTotal = data.reduce((sum, p) => sum + p.netSalary, 0)
  const grandUnpaid = data.reduce((sum, p) => sum + p.unpaidCoefficient, 0)
  const sorted = [...data].sort((a, b) => b.totalCoefficient - a.totalCoefficient)

  return (
    <div className="space-y-3">
      <div className="p-3 flex items-center justify-between"
        style={{ background: 'var(--primary-soft)', borderRadius: 'var(--radius)' }}>
        <span className="text-sm font-medium">Tổng lương phải trả</span>
        <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatWon(grandTotal)}</span>
      </div>

      {grandUnpaid > 0 && (
        <div className="p-3 flex items-center justify-between"
          style={{ background: 'var(--warning-soft, rgba(234, 179, 8, 0.12))', borderRadius: 'var(--radius)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--warning)' }}>Công chưa nhập lương</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>{grandUnpaid.toFixed(1)} công</span>
        </div>
      )}

      <div className="overflow-auto" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table className="w-full text-center text-sm">
          <thead className="text-xs uppercase" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
            <tr>
              <th className="px-2 py-2 w-8">#</th>
              <th className="px-2 py-2 text-center">Tên</th>
              <th className="px-2 py-2">Có lương</th>
              <th className="px-2 py-2">Chưa lương</th>
              <th className="px-2 py-2">Lương</th>
              <th className="px-2 py-2">Tạm ứng</th>
              <th className="px-2 py-2">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.userId} className="hover:bg-[var(--bg-hover)]"
                style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-2 py-2">
                  {i === 0 ? <Trophy size={14} style={{ color: 'var(--warning)' }} className="mx-auto" /> : i + 1}
                </td>
                <td className="px-2 py-2 font-semibold">{p.name}</td>
                <td className="px-2 py-2">{p.paidCoefficient.toFixed(1)}</td>
                <td className="px-2 py-2" style={{ color: p.unpaidCoefficient > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  {p.unpaidCoefficient.toFixed(1)}
                </td>
                <td className="px-2 py-2">{formatWon(p.totalSalary)}</td>
                <td className="px-2 py-2" style={{ color: 'var(--orange)' }}>{formatWon(p.totalAdvances)}</td>
                <td className="px-2 py-2 font-semibold"
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
