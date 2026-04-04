interface Props {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onCancel}
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-[320px] p-6" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <h3 className="text-base font-bold mb-2">{title}</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm rounded-[var(--radius)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px solid var(--border)' }}>Huỷ</button>
          <button onClick={onConfirm}
            className="flex-1 py-2 text-white text-sm font-semibold hover:opacity-90 rounded-[var(--radius)]"
            style={{ background: 'var(--danger)' }}>Xác nhận</button>
        </div>
      </div>
    </div>
  )
}
