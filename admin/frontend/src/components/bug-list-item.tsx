import type { githubapi } from '../../wailsjs/go/models'

type Props = {
  issue: githubapi.Issue
  onSelect: (issue: githubapi.Issue) => void
}

function fmtDate(iso: string | Date) {
  const d = iso instanceof Date ? iso : new Date(String(iso))
  if (isNaN(d.getTime())) return String(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function truncate(s: string, max: number) {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function userContact(body: string): string {
  const m = /\*\*User Contact:\*\*\s*(.+)/i.exec(body ?? '')
  return m?.[1]?.trim() ?? ''
}

export function BugListItem({ issue, onSelect }: Props) {
  const contact = userContact(issue.body)
  return (
    <button
      onClick={() => onSelect(issue)}
      className="w-full text-left px-4 py-3 border-b flex items-start gap-3"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <span
        className="text-xs font-mono shrink-0 mt-0.5"
        style={{ color: 'var(--text-muted)' }}
      >
        #{issue.number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {truncate(issue.title, 70)}
        </div>
        <div
          className="text-xs mt-0.5 flex gap-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>{fmtDate(issue.created_at)}</span>
          {contact && <span className="truncate">{contact}</span>}
        </div>
      </div>
    </button>
  )
}
