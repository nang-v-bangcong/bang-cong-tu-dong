import { type WsSummary, formatWon } from '../lib/utils'
import { MapPin } from 'lucide-react'

interface Props {
  userName?: string
  totalDays: number
  totalCoefficient: number
  totalSalary: number
  totalAdvances: number
  netSalary: number
  worksiteBreakdown?: WsSummary[]
}

export function MonthSummary({ userName, totalDays, totalCoefficient, totalSalary, totalAdvances, netSalary, worksiteBreakdown }: Props) {
  return (
    <div className="space-y-2">
      {userName && (
        <div className="space-y-1">
          <Row label="Tên" value={userName} />
        </div>
      )}
      <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <Row label="Ngày làm" value={`${totalDays} ngày`} />
        <Row label="Tổng hệ số" value={totalCoefficient.toFixed(1)} />
        <Row label="Tổng lương" value={formatWon(totalSalary)} color="var(--primary)" bold />
        <Row label="Tạm ứng" value={formatWon(totalAdvances)} color="var(--orange)" />
      </div>

      {worksiteBreakdown && worksiteBreakdown.length > 0 && (
        <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Theo nơi làm việc</span>
          </div>
          {worksiteBreakdown.map((ws, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{ws.worksiteName}</span>
              <span className="text-right">
                <span>{ws.totalCoeff.toFixed(1)} công</span>
                {ws.dailyWage > 0 && (
                  <span className="ml-1.5" style={{ color: 'var(--primary)' }}>
                    ({formatWon(ws.totalSalary)})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Thực nhận</span>
          <span className="text-lg font-bold" style={{ color: netSalary < 0 ? 'var(--danger)' : 'var(--success)' }}>
            {formatWon(netSalary)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={color ? { color, fontWeight: bold ? 700 : undefined } : undefined}>{value}</span>
    </div>
  )
}
