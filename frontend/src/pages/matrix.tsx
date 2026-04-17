import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '../stores/app-store'
import { type Worksite, mapWorksites } from '../lib/utils'
import { MatrixTable } from '../components/matrix-table'
import { ZoomableArea } from '../components/zoomable-area'
import { dateOf } from '../lib/matrix-utils'
import { type models } from '../../wailsjs/go/models'
import {
  GetTeamMonthMatrix,
  GetWorksites,
  UpsertAttendance,
  UpsertDayNote,
  BulkUpsertWorksite,
} from '../../wailsjs/go/main/App'

export function MatrixPage() {
  const { yearMonth, refreshTrigger } = useAppStore()
  const [matrix, setMatrix] = useState<models.TeamMatrix | null>(null)
  const [worksites, setWorksites] = useState<Worksite[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [m, ws] = await Promise.all([GetTeamMonthMatrix(yearMonth), GetWorksites()])
      setMatrix(m)
      setWorksites(mapWorksites(ws as any[]))
    } catch {
      toast.error('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [yearMonth])

  useEffect(() => { load() }, [load, refreshTrigger])

  const handleCellSave = useCallback(async (userId: number, day: number, coef: number, wsId: number | null) => {
    try {
      await UpsertAttendance(userId, dateOf(yearMonth, day), coef, wsId as any, '')
      load()
    } catch { toast.error('Lỗi lưu ô') }
  }, [yearMonth, load])

  const handleBulkAssign = useCallback(async (cells: Array<{ userId: number; day: number }>, wsId: number | null) => {
    try {
      const refs = cells.map((c) => ({ userId: c.userId, date: dateOf(yearMonth, c.day) }))
      await BulkUpsertWorksite(refs as any, wsId as any)
      toast.success(`Đã gán ${cells.length} ô`)
      load()
    } catch { toast.error('Lỗi gán công trường') }
  }, [yearMonth, load])

  const handleDayNoteSave = useCallback(async (day: number, note: string) => {
    try {
      await UpsertDayNote(yearMonth, day, note)
      load()
    } catch { toast.error('Lỗi lưu ghi chú') }
  }, [yearMonth, load])

  if (loading && !matrix) return <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>Đang tải...</p>
  if (!matrix) return null

  return (
    <div className="h-full p-3">
      <ZoomableArea storageKey="zoom-matrix">
        <MatrixTable
          matrix={matrix}
          worksites={worksites}
          onCellSave={handleCellSave}
          onBulkAssign={handleBulkAssign}
          onDayNoteSave={handleDayNoteSave}
        />
      </ZoomableArea>
    </div>
  )
}
