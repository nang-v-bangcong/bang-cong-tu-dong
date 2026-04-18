export function getMonthDays(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function getWeekdayShort(yearMonth: string, day: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return labels[d.getDay()]
}

export function isSundayOf(yearMonth: string, day: number): boolean {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, day).getDay() === 0
}

export function listSundays(yearMonth: string): number[] {
  const dim = getMonthDays(yearMonth)
  const out: number[] = []
  for (let d = 1; d <= dim; d++) if (isSundayOf(yearMonth, d)) out.push(d)
  return out
}

// Hash string to a stable HSL color — same name always gets same color.
export function hashColor(name: string): string {
  if (!name) return 'transparent'
  const hue = hashHue(name)
  return `hsl(${hue}, 65%, 55%)`
}

export function hashBg(name: string, alpha: number): string {
  if (!name) return 'transparent'
  return `hsla(${hashHue(name)}, 65%, 55%, ${alpha})`
}

function hashHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return Math.abs(h) % 360
}

export function cellKey(userId: number, day: number): string {
  return `${userId}-${day}`
}

export function parseCellKey(key: string): { userId: number; day: number } {
  const [u, d] = key.split('-').map(Number)
  return { userId: u, day: d }
}

export function dateOf(yearMonth: string, day: number): string {
  return `${yearMonth}-${String(day).padStart(2, '0')}`
}

export function formatCoef(n: number): string {
  if (!n) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export interface WsBreakdownItem {
  wsId: number | null
  wsName: string
  totalCoef: number
  totalSalary: number
}

interface BreakdownRow {
  userId: number
  cells?: Record<number, { coefficient: number; worksiteId?: number; worksiteName?: string }> | null
}

// Group cells by worksite and compute per-group totals. Mirrors backend
// wage rule: worksite.dailyWage overrides user.dailyWage when > 0.
export function computeWsBreakdown(
  rows: BreakdownRow[],
  users: Map<number, { dailyWage: number }>,
  worksites: Map<number, { dailyWage: number; name: string }>,
): WsBreakdownItem[] {
  const groups = new Map<string, WsBreakdownItem>()
  for (const row of rows) {
    const userWage = users.get(row.userId)?.dailyWage ?? 0
    const cells = row.cells
    if (!cells) continue
    for (const key of Object.keys(cells)) {
      const cell = cells[key as unknown as number]
      if (!cell || !cell.coefficient) continue
      const wsId = cell.worksiteId ?? null
      const ws = wsId != null ? worksites.get(wsId) : undefined
      const wsWage = ws?.dailyWage ?? 0
      const effective = wsWage > 0 ? wsWage : userWage
      const salary = cell.coefficient * effective
      const groupKey = wsId == null ? 'null' : String(wsId)
      const existing = groups.get(groupKey)
      if (existing) {
        existing.totalCoef += cell.coefficient
        existing.totalSalary += salary
      } else {
        const wsName = wsId == null ? 'Chưa gán' : (ws?.name ?? cell.worksiteName ?? `#${wsId}`)
        groups.set(groupKey, { wsId, wsName, totalCoef: cell.coefficient, totalSalary: salary })
      }
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.totalCoef - a.totalCoef)
}
