import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
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
import { TeamUserBar } from '../components/team-user-bar'
import { TeamToolbar } from '../components/team-toolbar'
import { useTodayScroll } from '../lib/use-today-scroll'
import { useTeamAttendance } from '../lib/use-team-attendance'
import {
  GetTeamUsers, CreateTeamUser, DeleteTeamUser, UpdateUser, BulkCreateUsers,
  GetMonthAttendance, GetMonthSummary, GetTeamMonthSummaries,
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
    const mapped = mapUsers(await GetTeamUsers())
    setUsers(mapped)
    return mapped
  }, [])

  const loadPersonData = useCallback(async (u: User): Promise<Attendance[] | null> => {
    try {
      setLoading(true)
      const [att, sum, ws, td, wsb] = await Promise.all([
        GetMonthAttendance(u.id, yearMonth), GetMonthSummary(u.id, yearMonth),
        GetWorksites(), GetToday(), GetWorksiteSummary(u.id, yearMonth),
      ])
      const mapped = mapAttendance(att)
      setRecords(mapped)
      setSummary(sum as Summary)
      setWorksites(mapWorksites(ws))
      setWsBreakdown((wsb || []) as WsSummary[])
      setToday(td)
      return mapped
    } catch { toast.error('Lỗi tải dữ liệu'); return null }
    finally { setLoading(false) }
  }, [yearMonth])

  const loadTeamSummary = useCallback(async () => {
    try {
      const rows = await GetTeamMonthSummaries(yearMonth) as Array<{ userId: number; userName: string; summary: Summary }>
      setTeamData(rows.map((r) => ({ ...r.summary, userId: r.userId, name: r.userName })))
    } catch { toast.error('Lỗi tải tổng kết') }
  }, [yearMonth])

  useEffect(() => {
    loadUsers().then((us) => {
      loadTeamSummary()
      if (us.length > 0 && !selected) setSelected(us[0])
    })
  }, [yearMonth, refreshTrigger, loadUsers, loadTeamSummary])

  useEffect(() => { if (selected) loadPersonData(selected) }, [selected, yearMonth, refreshTrigger, loadPersonData])

  const reload = async () => { const us = await loadUsers(); loadTeamSummary(); return us }
  const reloadPerson = useCallback(async () => selected ? loadPersonData(selected) : null, [selected, loadPersonData])

  const handleAddPerson = async (name: string, dailyWage: number) => {
    try {
      const u = await CreateTeamUser(name, dailyWage)
      await reload(); setSelected({ id: u.id, name: u.name, dailyWage: u.dailyWage })
      toast.success(`Đã thêm ${name}`)
    } catch { toast.error('Lỗi thêm người') }
  }

  const handleBulkAddPerson = async (names: string[]) => {
    try {
      const res = await BulkCreateUsers(names)
      const created = res.created?.length ?? 0
      const skippedList = res.skipped ?? []
      await reload()
      if (created > 0) toast.success(`Đã thêm ${created} người`)
      if (skippedList.length > 0) toast.warning(`${skippedList.length} tên bị trùng, đã bỏ qua: ${skippedList.join(', ')}. Hãy thêm họ hoặc số để phân biệt.`, { duration: 8000 })
      else if (created === 0) toast.info('Tất cả tên đã tồn tại')
    } catch { toast.error('Lỗi thêm nhiều người') }
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

  const handleEditUser = async (name: string, dailyWage: number) => {
    if (!selected) return
    try {
      await UpdateUser(selected.id, name, dailyWage)
      const updated = { ...selected, name, dailyWage }
      setSelected(updated); setShowEdit(false); await reload(); loadPersonData(updated)
      toast.success('Đã cập nhật')
    } catch { toast.error('Lỗi cập nhật') }
  }

  const {
    handleSave, handleDelete, handleQuickAdd, handleCopy,
    onUndo, onRedo, undoCount, redoCount,
  } = useTeamAttendance({ yearMonth, selected, today, records, reloadPerson, reloadSummary: loadTeamSummary })

  const handleExport = async () => {
    if (!selected) return
    try { const p = await ExportPDF(selected.id, selected.name, yearMonth); toast.success(`Đã lưu: ${p}`) }
    catch { toast.error('Huỷ xuất PDF') }
  }

  const { hasToday, onGoToday } = useTodayScroll({
    today, yearMonth, bindKey: true,
    getTarget: (t) => document.querySelector(`tr[data-date="${t}"]`),
    scrollOpts: { block: 'center', behavior: 'smooth' },
  })

  return (
    <>
      <ResizableSplit
        left={
          <div className="flex flex-col h-full p-3 gap-3">
            <TeamUserBar
              users={users}
              selected={selected}
              onSelect={setSelected}
              onRequestDelete={setDeleteTarget}
              onAdd={() => setShowAdd(true)}
              onBatch={() => setShowBatch(true)}
            />
            {selected && <TeamToolbar hasToday={hasToday} onToday={onGoToday} undoCount={undoCount} redoCount={redoCount} onUndo={onUndo} onRedo={onRedo} />}
            {!selected
              ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Chưa có người nào. Bấm "Thêm" để bắt đầu.</p>
              : loading
                ? <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Đang tải...</div>
                : <ZoomableArea storageKey="zoom-team" className="flex-1"><AttendanceTable yearMonth={yearMonth} records={records} worksites={worksites} today={today} onSave={handleSave} onDelete={handleDelete} /></ZoomableArea>}
          </div>
        }
        right={
          <div className="p-3 flex flex-col gap-3 h-full overflow-auto" style={{ background: 'var(--bg-muted)' }}>
            {selected && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thông tin</span>
                  <button onClick={() => setShowEdit(true)} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><Pencil size={14} /></button>
                </div>
                <MonthSummary userName={selected.name} {...summary} worksiteBreakdown={wsBreakdown} />
                <AdvancePanel userId={selected.id} yearMonth={yearMonth} onChanged={() => { loadPersonData(selected); loadTeamSummary() }} />
                <QuickActions onQuickAdd={handleQuickAdd} onCopyPrev={handleCopy} onExportPDF={handleExport} />
              </>
            )}
            <TeamSummary data={teamData} />
          </div>
        }
      />
      <AddPersonDialog open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddPerson} onBulkSave={handleBulkAddPerson} />
      {selected && <EditUserDialog open={showEdit} name={selected.name} dailyWage={selected.dailyWage} onSave={handleEditUser} onClose={() => setShowEdit(false)} />}
      <ConfirmDialog open={!!deleteTarget} title="Xóa người" message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Dữ liệu chấm công sẽ bị mất.`} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
      <BatchAttendance open={showBatch} users={users} onClose={() => setShowBatch(false)} onDone={() => { reload(); if (selected) loadPersonData(selected) }} />
    </>
  )
}
