import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Pencil, Users } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { type User, type Attendance, type Summary, type WsSummary, type Worksite, mapAttendance, mapWorksites, mapUsers } from '../lib/utils'
import { AddPersonDialog } from '../components/add-person-dialog'
import { EditUserDialog } from '../components/edit-user-dialog'
import { ConfirmDialog } from '../components/confirm-dialog'
import { MonthSummary } from '../components/month-summary'
import { AttendanceTable } from '../components/attendance-table'
import { AdvancePanel } from '../components/advance-panel'
import { QuickActions } from '../components/quick-actions'
import { TeamSummary } from '../components/team-summary'
import { ResizableSplit } from '../components/resizable-split'
import { BatchAttendance } from '../components/batch-attendance'
import { ZoomableArea } from '../components/zoomable-area'
import {
  GetTeamUsers, CreateTeamUser, DeleteTeamUser, UpdateUser,
  GetMonthAttendance, UpsertAttendance, DeleteAttendance,
  GetMonthSummary, CopyPreviousDay,
  GetWorksites, GetToday, ExportPDF, GetWorksiteSummary,
} from '../../wailsjs/go/main/App'

interface PersonSummary extends Summary { userId: number; name: string }

export function TeamPage() {
  const { yearMonth, refreshTrigger } = useAppStore()
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<Attendance[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalDays: 0, totalCoefficient: 0, totalSalary: 0, totalAdvances: 0, netSalary: 0,
    paidDays: 0, paidCoefficient: 0, unpaidDays: 0, unpaidCoefficient: 0,
  })
  const [teamData, setTeamData] = useState<PersonSummary[]>([])
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [wsBreakdown, setWsBreakdown] = useState<WsSummary[]>([])
  const [today, setToday] = useState('')

  const loadUsers = useCallback(async () => {
    const mapped = mapUsers(await GetTeamUsers() as any[])
    setUsers(mapped)
    return mapped
  }, [])

  const loadPersonData = useCallback(async (u: User) => {
    try {
      setLoading(true)
      const [att, sum, ws, td, wsb] = await Promise.all([
        GetMonthAttendance(u.id, yearMonth), GetMonthSummary(u.id, yearMonth),
        GetWorksites(), GetToday(), GetWorksiteSummary(u.id, yearMonth),
      ])
      setRecords(mapAttendance(att as any[]))
      setSummary(sum as Summary)
      setWorksites(mapWorksites(ws as any[]))
      setWsBreakdown((wsb || []) as WsSummary[])
      setToday(td)
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setLoading(false) }
  }, [yearMonth])

  const loadTeamSummary = useCallback(async (us: User[]) => {
    try {
      const summaries = await Promise.all(
        us.map(async (u) => {
          const s = await GetMonthSummary(u.id, yearMonth) as Summary
          return { ...s, userId: u.id, name: u.name }
        })
      )
      setTeamData(summaries)
    } catch { toast.error('Lỗi tải tổng kết') }
  }, [yearMonth])

  useEffect(() => {
    loadUsers().then((us) => {
      loadTeamSummary(us)
      if (us.length > 0 && !selected) setSelected(us[0])
    })
  }, [yearMonth, refreshTrigger, loadUsers, loadTeamSummary])

  useEffect(() => { if (selected) loadPersonData(selected) }, [selected, yearMonth, refreshTrigger, loadPersonData])

  const reload = async () => { const us = await loadUsers(); loadTeamSummary(us); return us }

  const handleAddPerson = async (name: string) => {
    try {
      const u = await CreateTeamUser(name) as any
      await reload(); setSelected({ id: u.id, name: u.name })
      toast.success(`Đã thêm ${name}`)
    } catch { toast.error('Lỗi thêm người') }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await DeleteTeamUser(deleteTarget.id)
      const us = await reload()
      if (selected?.id === deleteTarget.id) setSelected(us[0] ?? null)
      setDeleteTarget(null); toast.success('Đã xóa')
    } catch { toast.error('Lỗi xóa') }
  }

  const handleEditUser = async (name: string) => {
    if (!selected) return
    try {
      await UpdateUser(selected.id, name)
      const updated = { ...selected, name }
      setSelected(updated); setShowEdit(false); await reload(); loadPersonData(updated)
      toast.success('Đã cập nhật')
    } catch { toast.error('Lỗi cập nhật') }
  }

  const handleSave = async (date: string, coeff: number, wsId: number | null, note: string) => {
    if (!selected) return
    try { await UpsertAttendance(selected.id, date, coeff, wsId as any, note); loadPersonData(selected); loadTeamSummary(users) }
    catch { toast.error('Lỗi lưu') }
  }

  const handleDelete = async (id: number) => {
    if (!selected) return
    try { await DeleteAttendance(id); loadPersonData(selected); loadTeamSummary(users) }
    catch { toast.error('Lỗi xóa') }
  }

  const handleQuickAdd = async () => {
    if (!selected || !today) return
    try { await UpsertAttendance(selected.id, today, 1, null as any, ''); loadPersonData(selected); loadTeamSummary(users); toast.success('Đã chấm công!') }
    catch { toast.error('Lỗi chấm công') }
  }

  const handleCopy = async () => {
    if (!selected || !today) return
    try { await CopyPreviousDay(selected.id, today); loadPersonData(selected); loadTeamSummary(users); toast.success('Đã copy') }
    catch { toast.error('Không tìm thấy ngày trước') }
  }

  const handleExport = async () => {
    if (!selected) return
    try { const p = await ExportPDF(selected.id, selected.name, yearMonth); toast.success(`Đã lưu: ${p}`) }
    catch { toast.error('Huỷ xuất PDF') }
  }

  return (
    <>
      <ResizableSplit
        left={
          <div className="flex flex-col h-full p-3 gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-0.5">
                  <button onClick={() => setSelected(u)}
                    className={`px-2.5 py-1 text-xs font-medium transition-all ${selected?.id === u.id ? 'text-white' : 'hover:bg-[var(--bg-hover)]'}`}
                    style={selected?.id === u.id
                      ? { background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }
                      : { background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
                    {u.name}
                  </button>
                  <button onClick={() => setDeleteTarget(u)} className="p-0.5 opacity-30 hover:opacity-100 hover:text-[var(--danger)] transition-opacity">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              <button onClick={() => setShowAdd(true)}
                className="px-2.5 py-1 text-xs text-white font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
                style={{ background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>
                <UserPlus size={12} /> Thêm
              </button>
              {users.length > 0 && (
                <button onClick={() => setShowBatch(true)}
                  className="px-2.5 py-1 text-xs text-white font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--success)', borderRadius: 'var(--radius-sm)' }}>
                  <Users size={12} /> Chấm công nhóm
                </button>
              )}
            </div>
            {selected ? (
              loading
                ? <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Đang tải...</div>
                : (
                  <ZoomableArea storageKey="zoom-team" className="flex-1">
                    <AttendanceTable yearMonth={yearMonth} records={records} worksites={worksites} today={today} onSave={handleSave} onDelete={handleDelete} />
                  </ZoomableArea>
                )
            ) : <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có người nào. Bấm "Thêm" để bắt đầu.</p>}
          </div>
        }
        right={
          <div className="p-3 flex flex-col gap-3 h-full overflow-auto" style={{ background: 'var(--bg-muted)' }}>
            {selected && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thông tin</span>
                  <button onClick={() => setShowEdit(true)} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={14} />
                  </button>
                </div>
                <MonthSummary userName={selected.name} {...summary} worksiteBreakdown={wsBreakdown} />
                <AdvancePanel userId={selected.id} yearMonth={yearMonth} onChanged={() => { loadPersonData(selected); loadTeamSummary(users) }} />
                <QuickActions onQuickAdd={handleQuickAdd} onCopyPrev={handleCopy} onExportPDF={handleExport} />
              </>
            )}
            <TeamSummary data={teamData} />
          </div>
        }
      />
      <AddPersonDialog open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddPerson} />
      {selected && <EditUserDialog open={showEdit} name={selected.name} onSave={handleEditUser} onClose={() => setShowEdit(false)} />}
      <ConfirmDialog open={!!deleteTarget} title="Xóa người" message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Dữ liệu chấm công sẽ bị mất.`} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
      <BatchAttendance open={showBatch} users={users} onClose={() => setShowBatch(false)} onDone={() => { reload(); if (selected) loadPersonData(selected) }} />
    </>
  )
}
