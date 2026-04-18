import { useState } from 'react'
import { toast } from 'sonner'
import { type User } from '../lib/utils'
import { MatrixRowMenu } from './matrix-row-menu'
import { EditUserDialog } from './edit-user-dialog'
import { ConfirmDialog } from './confirm-dialog'
import { DeleteTeamUser, UpdateUser, ExportPDF } from '../../wailsjs/go/main/App'

export interface RowMenuState { userId: number; userName: string; x: number; y: number }

interface Props {
  yearMonth: string
  users: User[]
  rowMenu: RowMenuState | null
  onClose: () => void
  onChanged: () => void
}

export function MatrixRowDialogs({ yearMonth, users, rowMenu, onClose, onChanged }: Props) {
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)

  const openEdit = () => {
    if (!rowMenu) return
    const u = users.find((x) => x.id === rowMenu.userId)
    if (!u) { toast.error('Không tìm thấy người dùng'); return }
    setEditTarget(u)
  }

  const handleSave = async (name: string, dailyWage: number) => {
    if (!editTarget) return
    try {
      await UpdateUser(editTarget.id, name, dailyWage)
      toast.success('Đã cập nhật')
      setEditTarget(null)
      onChanged()
    } catch { toast.error('Lỗi cập nhật') }
  }

  const handleExport = async () => {
    if (!rowMenu) return
    try {
      const p = await ExportPDF(rowMenu.userId, rowMenu.userName, yearMonth)
      if (p) toast.success(`Đã lưu: ${p}`)
    } catch { toast.error('Huỷ xuất PDF') }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await DeleteTeamUser(deleteTarget.id)
      toast.success('Đã xóa')
      setDeleteTarget(null)
      onChanged()
    } catch { toast.error('Lỗi xóa') }
  }

  return (
    <>
      {rowMenu && (
        <MatrixRowMenu
          userName={rowMenu.userName}
          x={rowMenu.x}
          y={rowMenu.y}
          onEdit={openEdit}
          onExportPDF={handleExport}
          onDelete={() => setDeleteTarget({ id: rowMenu.userId, name: rowMenu.userName })}
          onClose={onClose}
        />
      )}
      {editTarget && (
        <EditUserDialog
          open
          name={editTarget.name}
          dailyWage={editTarget.dailyWage}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa người"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Dữ liệu chấm công sẽ bị mất.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
