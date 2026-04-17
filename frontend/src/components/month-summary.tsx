import { type WsSummary, formatWon } from '../lib/utils'
import { MapPin, AlertTriangle } from 'lucide-react'

interface Props {
  userName?: string
  totalDays: number
  totalCoefficient: number
  totalSalary: number
  totalAdvances: number
  netSalary: number
  paidDays: number
  paidCoefficient: number
  unpaidDays: number
  unpaidCoefficient: number
  worksiteBreakdown?: WsSummary[]
}

export function MonthSummary({
  userName, totalDays, totalCoefficient, totalSalary, totalAdvances, netSalary,
  paidDays, paidCoefficient, unpaidDays, unpaidCoefficient, worksiteBreakdown,
}: Props) {
  const paidSites = (worksiteBreakdown ?? []).filter((w) => w.dailyWage > 0)
  const unpaidSites = (worksiteBreakdown ?? []).filter((w) => w.dailyWage <= 0)

  return (
    <div className="space-y-2">
      {userName && (
        <div className="space-y-1">
          <Row label="Tên" value={userName} />
        </div>
      )}
      <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <Row label="Tổng ngày" value={`${totalDays} ngày`} />
        <Row label="Tổng hệ số" value={totalCoefficient.toFixed(1)} />
        <Row label="Có lương" value={`${paidDays} ngày • ${paidCoefficient.toFixed(1)} công`} color="var(--success)" />
        <Row label="Chưa có lương" value={`${unpaidDays} ngày • ${unpaidCoefficient.toFixed(1)} công`} color={unpaidDays > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
        <Row label="Tổng lương" value={formatWon(totalSalary)} color="var(--primary)" bold />
        <Row label="Tạm ứng" value={formatWon(totalAdvances)} color="var(--orange)" />
      </div>

      {paidSites.length > 0 && (
        <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Đã có lương theo nơi làm</span>
          </div>
          {paidSites.map((ws, i) => (
            <div key={`p-${i}`} className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{ws.worksiteName}</span>
              <span className="text-right">
                <span>{ws.totalCoeff.toFixed(1)} công</span>
                <span className="ml-1.5" style={{ color: 'var(--primary)' }}>({formatWon(ws.totalSalary)})</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {unpaidSites.length > 0 && (
        <div className="pt-2 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} style={{ color: 'var(--warning)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Chưa có lương</span>
          </div>
          {unpaidSites.map((ws, i) => (
            <div key={`u-${i}`} className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-muted)' }}>
                {ws.worksiteId ? ws.worksiteName : 'Chưa gán nơi làm việc'}
              </span>
              <span>{ws.totalCoeff.toFixed(1)} công</span>
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
