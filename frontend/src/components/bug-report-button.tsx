import { useState } from 'react'
import { Bug } from 'lucide-react'
import { BugReportDialog } from './bug-report-dialog'

export function BugReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Báo lỗi"
        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Bug size={16} />
      </button>
      {open && <BugReportDialog onClose={() => setOpen(false)} />}
    </>
  )
}
