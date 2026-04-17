// --- Shared types ---

export interface User { id: number; name: string }
export interface Worksite { id: number; name: string; dailyWage: number }
export interface Attendance { id: number; date: string; coefficient: number; worksiteId: number | null; note: string }
export interface Summary {
  totalDays: number
  totalCoefficient: number
  totalSalary: number
  totalAdvances: number
  netSalary: number
  paidDays: number
  paidCoefficient: number
  unpaidDays: number
  unpaidCoefficient: number
}
export interface WsSummary { worksiteId: number | null; worksiteName: string; dailyWage: number; totalCoeff: number; totalSalary: number }

// --- Mappers (avoid repeated `as any` casts) ---

type RawList<T> = ReadonlyArray<T> | null | undefined

export function mapAttendance(raw: RawList<any>): Attendance[] {
  return (raw ?? []).map((a) => ({ id: a.id, date: a.date, coefficient: a.coefficient, worksiteId: a.worksiteId, note: a.note }))
}

export function mapWorksites(raw: RawList<any>): Worksite[] {
  return (raw ?? []).map((w) => ({ id: w.id, name: w.name, dailyWage: w.dailyWage }))
}

export function mapUsers(raw: RawList<any>): User[] {
  return (raw ?? []).map((u) => ({ id: u.id, name: u.name }))
}

// --- Formatters ---

export function formatWon(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '₩'
}

export function formatDay(date: string): number {
  return new Date(date + 'T00:00:00').getDate()
}

export function getDaysInMonth(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const days = new Date(year, month, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${yearMonth}-${day}`
  })
}

export function getDayOfWeek(date: string): string {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return days[new Date(date + 'T00:00:00').getDay()]
}
