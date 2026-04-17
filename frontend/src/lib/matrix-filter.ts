import type { models } from '../../wailsjs/go/models'

export type SortBy = 'name' | 'days' | 'salary'
export type SortDir = 'asc' | 'desc'

export function filterSortRows(
  rows: models.MatrixRow[],
  search: string,
  sortBy: SortBy,
  sortDir: SortDir,
): models.MatrixRow[] {
  let list = rows
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((r) => r.userName.toLowerCase().includes(q))
  }
  const cmp = (a: models.MatrixRow, b: models.MatrixRow) => {
    let d = 0
    if (sortBy === 'name') d = a.userName.localeCompare(b.userName, 'vi')
    else if (sortBy === 'days') d = a.totalDays - b.totalDays
    else if (sortBy === 'salary') d = a.salary - b.salary
    return sortDir === 'asc' ? d : -d
  }
  return [...list].sort(cmp)
}
