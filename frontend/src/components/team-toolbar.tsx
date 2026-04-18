import { Calendar } from 'lucide-react'

interface Props {
  hasToday: boolean
  onToday: () => void
}

export function TeamToolbar({ hasToday, onToday }: Props) {
  if (!hasToday) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onToday}
        className="flex items-center gap-1 px-2.5 py-1 text-xs"
        style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        title="Cuộn đến ngày hôm nay (T)"
      >
        <Calendar size={12} /> Hôm nay
      </button>
    </div>
  )
}
