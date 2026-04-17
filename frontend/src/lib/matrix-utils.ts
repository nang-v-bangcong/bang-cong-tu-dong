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

// Hash string to a stable HSL color — same name always gets same color.
export function hashColor(name: string): string {
  if (!name) return 'transparent'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  const hue = Math.abs(h) % 360
  return `hsl(${hue}, 65%, 55%)`
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
