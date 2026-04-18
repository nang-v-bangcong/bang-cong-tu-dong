import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '../stores/app-store'
import { useHistoryStore } from '../stores/history-store'
import { type User, type Worksite, mapUsers, mapWorksites } from '../lib/utils'
import { computeWsBreakdown } from '../lib/matrix-utils'
import { MatrixTable } from '../components/matrix-table'
import { MatrixToolbar } from '../components/matrix-toolbar'
import { MatrixPrintView } from '../components/matrix-print-view'
import { AddPersonDialog } from '../components/add-person-dialog'
import { ZoomableArea } from '../components/zoomable-area'
import { ConfirmDialog } from '../components/confirm-dialog'
import { CopyDayDialog } from '../components/copy-day-dialog'
import { FillSundaysDialog } from '../components/fill-sundays-dialog'
import { MatrixRowDialogs, type RowMenuState } from '../components/matrix-row-dialogs'
import { useMatrixMutations, type BulkCells } from '../lib/use-matrix-mutations'
import { useMatrixKeyboard } from '../lib/use-matrix-keyboard'
import { useTodayScroll } from '../lib/use-today-scroll'
import { type models } from '../../wailsjs/go/models'
import { GetTeamMonthMatrix, GetWorksites, GetTeamUsers, GetToday, CreateTeamUser, BulkCreateUsers, ExportMatrixExcel } from '../../wailsjs/go/main/App'

type Confirm = { msg: string; onOK: () => void }

export function MatrixPage() {
  const {
    yearMonth, refreshTrigger, triggerRefresh,
    matrixSearch, matrixSortBy, matrixSortDir, matrixCellColor,
    paintMode, paintCoef, paintWsId, setPaintMode, setPaintPreset,
    setMatrixSearch, setMatrixSort, toggleMatrixCellColor } = useAppStore()
  const clearHistory = useHistoryStore((s) => s.clear)
  const matrixCounts = useHistoryStore((s) => s.stacks.matrix)

  const [matrix, setMatrix] = useState<models.TeamMatrix | null>(null)
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [copyDialog, setCopyDialog] = useState<{ srcDay: number } | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null)
  const [showFillSundays, setShowFillSundays] = useState(false)

  const load = useCallback(async (): Promise<models.TeamMatrix | null> => {
    try {
      setLoading(true)
      const [m, ws, us, td] = await Promise.all([GetTeamMonthMatrix(yearMonth), GetWorksites(), GetTeamUsers(), GetToday()])
      setMatrix(m); setWorksites(mapWorksites(ws)); setUsers(mapUsers(us)); setToday(td)
      return m
    } catch { toast.error('Lỗi tải dữ liệu'); return null }
    finally { setLoading(false) }
  }, [yearMonth])

  useEffect(() => { load() }, [load, refreshTrigger])
  useEffect(() => { clearHistory('matrix') }, [yearMonth, clearHistory])

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

  const handleAddPerson = useCallback(async (name: string, dailyWage: number) => {
    try { await CreateTeamUser(name, dailyWage); toast.success(`Đã thêm ${name}`); triggerRefresh() }
    catch { toast.error('Lỗi thêm người') }
  }, [triggerRefresh])

  const handleBulkAddPerson = useCallback(async (names: string[]) => {
    try {
      const res = await BulkCreateUsers(names)
      const skipped = res.skipped ?? []
      const created = res.created?.length ?? 0
      if (created > 0) toast.success(`Đã thêm ${created} người`)
      if (skipped.length > 0) toast.warning(`${skipped.length} tên bị trùng, đã bỏ qua: ${skipped.join(', ')}. Hãy thêm họ hoặc số để phân biệt.`, { duration: 8000 })
      else if (created === 0) toast.info('Tất cả tên đã tồn tại')
      triggerRefresh()
    } catch { toast.error('Lỗi thêm nhiều người') }
  }, [triggerRefresh])

  const handleExportExcel = useCallback(async () => {
    try {
      const path = await ExportMatrixExcel(yearMonth)
      if (path) toast.success(`Đã lưu: ${path}`)
    } catch (e: any) { toast.error('Lỗi xuất Excel: ' + (e?.message ?? e ?? '')) }
  }, [yearMonth])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const { hasToday, onGoToday } = useTodayScroll({
    today, yearMonth, bindKey: false,
    getTarget: (t) => {
      const d = parseInt(t.slice(8, 10), 10)
      const cell = document.querySelector(`tbody tr:first-child td[data-day="${d}"]`) as HTMLElement | null
      cell?.click()
      return cell
    },
    scrollOpts: { inline: 'center', block: 'nearest', behavior: 'smooth' },
  })

  const togglePaint = useCallback(() => { setPaintMode(!paintMode) }, [paintMode, setPaintMode])
  useMatrixKeyboard({ runUndo: m.runUndo, runRedo: m.runRedo, onGoToday, onTogglePaint: togglePaint })

  const popUndo = useHistoryStore((s) => s.popUndo)
  const popRedo = useHistoryStore((s) => s.popRedo)
  const onUndoClick = useCallback(async () => {
    const entry = popUndo('matrix')
    if (!entry) { toast.info('Không còn thao tác để hoàn tác'); return }
    try { await m.runUndo(entry); toast.success('Đã hoàn tác') }
    catch { toast.error('Lỗi hoàn tác') }
  }, [popUndo, m])
  const onRedoClick = useCallback(async () => {
    const entry = popRedo('matrix')
    if (!entry) { toast.info('Không còn thao tác để làm lại'); return }
    try { await m.runRedo(entry); toast.success('Đã làm lại') }
    catch { toast.error('Lỗi làm lại') }
  }, [popRedo, m])

  const breakdown = useMemo(() => matrix
    ? computeWsBreakdown(matrix.rows,
        new Map(users.map((u) => [u.id, { dailyWage: u.dailyWage }])),
        new Map(worksites.map((w) => [w.id, { dailyWage: w.dailyWage, name: w.name }])))
    : [], [matrix, users, worksites])

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
        hasToday={hasToday}
        onToday={onGoToday}
        worksites={worksites}
        paintMode={paintMode} paintCoef={paintCoef} paintWsId={paintWsId}
        onSetPaintMode={setPaintMode} onSetPaintPreset={setPaintPreset}
        onFillSundaysClick={() => setShowFillSundays(true)}
        undoCount={matrixCounts.past.length}
        redoCount={matrixCounts.future.length}
        onUndo={onUndoClick}
        onRedo={onRedoClick}
      />
      <ZoomableArea storageKey="zoom-matrix" className="flex-1 min-h-0">
        <MatrixTable
          matrix={matrix}
          worksites={worksites}
          breakdown={breakdown}
          search={matrixSearch}
          sortBy={matrixSortBy}
          sortDir={matrixSortDir}
          cellColorOn={matrixCellColor}
          today={today}
          paintMode={paintMode} paintCoef={paintCoef} paintWsId={paintWsId}
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
          onRowMenu={(userId, userName, x, y) => setRowMenu({ userId, userName, x, y })}
        />
      </ZoomableArea>
      <ConfirmDialog open={!!confirm} title="Xác nhận" message={confirm?.msg ?? ''} onConfirm={() => confirm?.onOK()} onCancel={() => setConfirm(null)} />
      {copyDialog && (
        <CopyDayDialog
          srcDay={copyDialog.srcDay}
          daysInMonth={matrix.daysInMonth}
          onConfirm={async (src, dst, ov) => { await m.onCopyDayConfirm(src, dst, ov); setCopyDialog(null) }}
          onCancel={() => setCopyDialog(null)}
        />
      )}
      {showFillSundays && (
        <FillSundaysDialog
          yearMonth={yearMonth}
          worksites={worksites}
          onConfirm={async (coef, wsId, ov) => { await m.onFillSundays(coef, wsId, ov); setShowFillSundays(false) }}
          onCancel={() => setShowFillSundays(false)}
        />
      )}
      <AddPersonDialog
        open={showAddPerson}
        onClose={() => setShowAddPerson(false)}
        onSave={handleAddPerson}
        onBulkSave={handleBulkAddPerson}
      />
      <MatrixRowDialogs
        yearMonth={yearMonth}
        users={users}
        rowMenu={rowMenu}
        onClose={() => setRowMenu(null)}
        onChanged={triggerRefresh}
      />
      <MatrixPrintView matrix={matrix} breakdown={breakdown} />
    </div>
  )
}
