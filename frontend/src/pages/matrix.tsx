import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '../stores/app-store'
import { useHistoryStore } from '../stores/matrix-history-store'
import { type Worksite, mapWorksites } from '../lib/utils'
import { MatrixTable } from '../components/matrix-table'
import { MatrixToolbar } from '../components/matrix-toolbar'
import { MatrixPrintView } from '../components/matrix-print-view'
import { AddPersonDialog } from '../components/add-person-dialog'
import { ZoomableArea } from '../components/zoomable-area'
import { ConfirmDialog } from '../components/confirm-dialog'
import { CopyDayDialog } from '../components/copy-day-dialog'
import { useMatrixMutations, type BulkCells } from '../lib/use-matrix-mutations'
import { type models } from '../../wailsjs/go/models'
import {
  GetTeamMonthMatrix, GetWorksites, GetToday,
  CreateTeamUser, BulkCreateUsers,
  ExportMatrixExcel,
} from '../../wailsjs/go/main/App'

type Confirm = { msg: string; onOK: () => void }

export function MatrixPage() {
  const {
    yearMonth, refreshTrigger, triggerRefresh,
    matrixSearch, matrixSortBy, matrixSortDir, matrixCellColor,
    setMatrixSearch, setMatrixSort, toggleMatrixCellColor,
  } = useAppStore()
  const clearHistory = useHistoryStore((s) => s.clear)
  const popUndo = useHistoryStore((s) => s.popUndo)
  const popRedo = useHistoryStore((s) => s.popRedo)

  const [matrix, setMatrix] = useState<models.TeamMatrix | null>(null)
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [copyDialog, setCopyDialog] = useState<{ srcDay: number } | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)

  const load = useCallback(async (): Promise<models.TeamMatrix | null> => {
    try {
      setLoading(true)
      const [m, ws, td] = await Promise.all([
        GetTeamMonthMatrix(yearMonth), GetWorksites(), GetToday(),
      ])
      setMatrix(m)
      setWorksites(mapWorksites(ws as any[]))
      setToday(td)
      return m
    } catch {
      toast.error('Lỗi tải dữ liệu')
      return null
    } finally {
      setLoading(false)
    }
  }, [yearMonth])

  useEffect(() => { load() }, [load, refreshTrigger])
  useEffect(() => { clearHistory() }, [yearMonth, clearHistory])

  const m = useMatrixMutations({ yearMonth, matrix, reload: load })

  const doBulkDelete = useCallback((cells: BulkCells) => m.onBulkDelete(cells), [m])

  const handleBulkDelete = useCallback((cells: BulkCells) => {
    if (cells.length === 0) return
    if (cells.length > 5) {
      setConfirm({ msg: `Xóa ${cells.length} ô đã chọn?`, onOK: () => { doBulkDelete(cells); setConfirm(null) } })
    } else doBulkDelete(cells)
  }, [doBulkDelete])

  const handleClearDay = useCallback((day: number) => {
    if (!matrix) return
    const cells: BulkCells = matrix.rows
      .filter((r) => r.cells?.[day]?.attendanceId)
      .map((r) => ({ userId: r.userId, day }))
    if (cells.length === 0) { toast.info(`Ngày ${day} chưa có dữ liệu`); return }
    setConfirm({ msg: `Xóa toàn bộ ${cells.length} ô của ngày ${day}?`, onOK: () => { doBulkDelete(cells); setConfirm(null) } })
  }, [matrix, doBulkDelete])

  const handleAddPerson = useCallback(async (name: string) => {
    try { await CreateTeamUser(name); toast.success(`Đã thêm ${name}`); triggerRefresh() }
    catch { toast.error('Lỗi thêm người') }
  }, [triggerRefresh])

  const handleBulkAddPerson = useCallback(async (names: string[]) => {
    try {
      const res = await BulkCreateUsers(names) as any
      const c = res.created?.length ?? 0
      const s = res.skipped?.length ?? 0
      if (c > 0) toast.success(`Đã thêm ${c} người${s > 0 ? ` (bỏ qua ${s} trùng)` : ''}`)
      else toast.info('Tất cả tên đã tồn tại')
      triggerRefresh()
    } catch { toast.error('Lỗi thêm nhiều người') }
  }, [triggerRefresh])

  const handleExportExcel = useCallback(async () => {
    try {
      const path = await ExportMatrixExcel(yearMonth)
      if (!path) return
      toast.success(`Đã lưu: ${path}`)
    } catch (e: any) {
      toast.error('Lỗi xuất Excel: ' + (e?.message ?? e ?? ''))
    }
  }, [yearMonth])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const entry = popUndo()
        if (!entry) { toast.info('Không còn thao tác để hoàn tác'); return }
        try { await m.runUndo(entry); toast.success('Đã hoàn tác') }
        catch { toast.error('Lỗi hoàn tác') }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        const entry = popRedo()
        if (!entry) { toast.info('Không còn thao tác để làm lại'); return }
        try { await m.runRedo(entry); toast.success('Đã làm lại') }
        catch { toast.error('Lỗi làm lại') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [m, popUndo, popRedo])

  if (loading && !matrix) return <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>Đang tải...</p>
  if (!matrix) return null

  return (
    <div className="h-full p-3 flex flex-col">
      <MatrixToolbar
        search={matrixSearch}
        onSearchChange={setMatrixSearch}
        onAddClick={() => setShowAddPerson(true)}
        cellColorOn={matrixCellColor}
        onToggleCellColor={toggleMatrixCellColor}
        sortBy={matrixSortBy}
        sortDir={matrixSortDir}
        onSortChange={setMatrixSort}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />
      <ZoomableArea storageKey="zoom-matrix" className="flex-1 min-h-0">
        <MatrixTable
          matrix={matrix}
          worksites={worksites}
          search={matrixSearch}
          sortBy={matrixSortBy}
          sortDir={matrixSortDir}
          cellColorOn={matrixCellColor}
          today={today}
          onCellSave={m.onCellSave}
          onBulkAssign={m.onBulkAssign}
          onBulkCoef={m.onBulkCoef}
          onBulkDelete={handleBulkDelete}
          onFillDay={m.onFillDay}
          onClearDay={handleClearDay}
          onCopyDay={(d) => setCopyDialog({ srcDay: d })}
          onCopyPrev={m.onCopyPrev}
          onPasteGrid={m.onPasteGrid}
          onFillRange={m.onFillRange}
          onDayNoteSave={m.onDayNoteSave}
        />
      </ZoomableArea>
      <ConfirmDialog
        open={!!confirm}
        title="Xác nhận"
        message={confirm?.msg ?? ''}
        onConfirm={() => confirm?.onOK()}
        onCancel={() => setConfirm(null)}
      />
      {copyDialog && (
        <CopyDayDialog
          srcDay={copyDialog.srcDay}
          daysInMonth={matrix.daysInMonth}
          onConfirm={async (src, dst, ov) => { await m.onCopyDayConfirm(src, dst, ov); setCopyDialog(null) }}
          onCancel={() => setCopyDialog(null)}
        />
      )}
      <AddPersonDialog
        open={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        onSave={handleAddPerson}
        onBulkSave={handleBulkAddPerson}
      />
      <MatrixPrintView matrix={matrix} />
    </div>
  )
}
