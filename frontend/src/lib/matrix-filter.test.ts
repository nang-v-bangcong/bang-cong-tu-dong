import { describe, it, expect } from 'vitest'
import { filterSortRows } from './matrix-filter'
import type { models } from '../../wailsjs/go/models'

const mk = (uid: number, name: string, days: number, salary: number): models.MatrixRow => ({
  userId: uid, userName: name,
  cells: {}, totalDays: days, totalCoef: days, salary,
} as unknown as models.MatrixRow)

const rows: models.MatrixRow[] = [
  mk(1, 'Charlie', 10, 300000),
  mk(2, 'Alice', 20, 500000),
  mk(3, 'Bob', 15, 200000),
]

describe('filterSortRows', () => {
  it('filters by search (case-insensitive, substring)', () => {
    const out = filterSortRows(rows, 'al', 'name', 'asc')
    expect(out.map((r) => r.userName)).toEqual(['Alice'])
  })

  it('filters with Vietnamese chars', () => {
    const vi = [...rows, mk(4, 'Đức', 5, 100000)]
    const out = filterSortRows(vi, 'đức', 'name', 'asc')
    expect(out.length).toBe(1)
    expect(out[0].userName).toBe('Đức')
  })

  it('sorts by name asc', () => {
    const out = filterSortRows(rows, '', 'name', 'asc')
    expect(out.map((r) => r.userName)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts by name desc', () => {
    const out = filterSortRows(rows, '', 'name', 'desc')
    expect(out.map((r) => r.userName)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('sorts by days asc', () => {
    const out = filterSortRows(rows, '', 'days', 'asc')
    expect(out.map((r) => r.userName)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('sorts by days desc', () => {
    const out = filterSortRows(rows, '', 'days', 'desc')
    expect(out.map((r) => r.userName)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts by salary desc', () => {
    const out = filterSortRows(rows, '', 'salary', 'desc')
    expect(out.map((r) => r.salary)).toEqual([500000, 300000, 200000])
  })

  it('does not mutate input', () => {
    const copy = [...rows]
    filterSortRows(rows, '', 'name', 'asc')
    expect(rows).toEqual(copy)
  })

  it('returns empty on no match', () => {
    const out = filterSortRows(rows, 'xyz', 'name', 'asc')
    expect(out).toEqual([])
  })

  it('returns all when search empty', () => {
    const out = filterSortRows(rows, '', 'name', 'asc')
    expect(out.length).toBe(3)
  })
})
