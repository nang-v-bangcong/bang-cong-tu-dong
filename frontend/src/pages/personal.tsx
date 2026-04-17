import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { useAppStore } from '../stores/app-store'
import { type User, type Attendance, type Summary, type WsSummary, type Worksite, mapAttendance, mapWorksites } from '../lib/utils'
import { SetupDialog } from '../components/setup-dialog'
import { MonthSummary } from '../components/month-summary'
import { AttendanceTable } from '../components/attendance-table'
import { AdvancePanel } from '../components/advance-panel'
import { QuickActions } from '../components/quick-actions'
import { EditUserDialog } from '../components/edit-user-dialog'
import { ResizableSplit } from '../components/resizable-split'
import { ZoomableArea } from '../components/zoomable-area'
import {
  GetSelfUser, EnsureSelfUser, UpdateUser,
  GetMonthAttendance, UpsertAttendance, DeleteAttendance,
  GetMonthSummary, CopyPreviousDay,
  GetWorksites, GetToday, ExportPDF, GetWorksiteSummary,
} from '../../wailsjs/go/main/App'

const EMPTY_SUMMARY: Summary = {
  totalDays: 0, totalCoefficient: 0, totalSalary: 0, totalAdvances: 0, netSalary: 0,
  paidDays: 0, paidCoefficient: 0, unpaidDays: 0, unpaidCoefficient: 0,
}

export function PersonalPage() {
  const { yearMonth, refreshTrigger } = useAppStore()
  const [user, setUser] = useState<User | null>(null)
  const [needSetup, setNeedSetup] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<Attendance[]>([])
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY)
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [wsBreakdown, setWsBreakdown] = useState<WsSummary[]>([])
  const [today, setToday] = useState('')

  const loadData = useCallback(async (u: User) => {
    try {
      setLoading(true)
      const [att, sum, ws, td, wsb] = await Promise.all([
        GetMonthAttendance(u.id, yearMonth), GetMonthSummary(u.id, yearMonth),
        GetWorksites(), GetToday(), GetWorksiteSummary(u.id, yearMonth),
      ])
      setRecords(mapAttendance(att))
      setSummary(sum as Summary)
      setWorksites(mapWorksites(ws))
      setWsBreakdown((wsb || []) as WsSummary[])
      setToday(td)
    } catch { toast.error('Lỗi tải dữ liệu') } finally { setLoading(false) }
  }, [yearMonth])

  useEffect(() => {
    GetSelfUser()
      .then((u: any) => { setUser(u); return u })
      .then((u: any) => loadData(u))
      .catch(() => { setNeedSetup(true); setLoading(false) })
  }, [yearMonth, refreshTrigger, loadData])

  const handleSetup = async (name: string) => {
    try {
      const u = await EnsureSelfUser(name)
      setUser(u); setNeedSetup(false); loadData(u)
      toast.success('Thiết lập thành công!')
    } catch { toast.error('Lỗi thiết lập') }
  }

  const handleEditUser = async (name: string) => {
    if (!user) return
    try {
      await UpdateUser(user.id, name)
      const updated = { ...user, name }
      setUser(updated); setShowEdit(false); loadData(updated)
      toast.success('Đã cập nhật thông tin')
    } catch { toast.error('Lỗi cập nhật') }
  }

  const handleSave = async (date: string, coeff: number, wsId: number | null, note: string) => {
    if (!user) return
    try { await UpsertAttendance(user.id, date, coeff, wsId, note); loadData(user) }
    catch { toast.error('Lỗi lưu chấm công') }
  }

  const handleDelete = async (id: number) => {
    if (!user) return
    try { await DeleteAttendance(id); loadData(user) } catch { toast.error('Lỗi xóa') }
  }

  const handleQuickAdd = async () => {
    if (!user || !today) return
    try { await UpsertAttendance(user.id, today, 1, null, ''); loadData(user); toast.success('Đã chấm công hôm nay!') }
    catch { toast.error('Lỗi chấm công') }
  }

  const handleCopy = async () => {
    if (!user || !today) return
    try { await CopyPreviousDay(user.id, today); loadData(user); toast.success('Đã copy từ ngày trước') }
    catch { toast.error('Không tìm thấy ngày trước') }
  }

  const handleExport = async () => {
    if (!user) return
    try { const p = await ExportPDF(user.id, user.name, yearMonth); toast.success(`Đã lưu: ${p}`) }
    catch { toast.error('Huỷ xuất PDF') }
  }

  if (needSetup) return <SetupDialog onSave={handleSetup} />
  if (!user) return <div className="p-4" style={{ color: 'var(--text-muted)' }}>Đang tải...</div>

  return (
    <>
      <ResizableSplit
        left={
          <div className="flex flex-col h-full p-3">
            {loading ? <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Đang tải...</div>
              : (
                <ZoomableArea storageKey="zoom-personal" className="flex-1">
                  <AttendanceTable yearMonth={yearMonth} records={records} worksites={worksites} today={today} onSave={handleSave} onDelete={handleDelete} />
                </ZoomableArea>
              )
            }
          </div>
        }
        right={
          <div className="p-3 flex flex-col gap-3 h-full overflow-auto" style={{ background: 'var(--bg-muted)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thông tin</span>
              <button onClick={() => setShowEdit(true)} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}><Pencil size={14} /></button>
            </div>
            <MonthSummary userName={user.name} {...summary} worksiteBreakdown={wsBreakdown} />
            <AdvancePanel userId={user.id} yearMonth={yearMonth} onChanged={() => loadData(user)} />
            <QuickActions onQuickAdd={handleQuickAdd} onCopyPrev={handleCopy} onExportPDF={handleExport} />
          </div>
        }
      />
      <EditUserDialog open={showEdit} name={user.name} onSave={handleEditUser} onClose={() => setShowEdit(false)} />
    </>
  )
}
