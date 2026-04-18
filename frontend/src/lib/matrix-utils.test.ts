import { describe, it, expect } from 'vitest'
import {
  getMonthDays,
  getWeekdayShort,
  isSundayOf,
  hashColor,
  cellKey,
  parseCellKey,
  dateOf,
  formatCoef,
  computeWsBreakdown,
} from './matrix-utils'

describe('getMonthDays', () => {
  it('returns 31 for Jan', () => expect(getMonthDays('2026-01')).toBe(31))
  it('returns 28 for Feb non-leap', () => expect(getMonthDays('2026-02')).toBe(28))
  it('returns 29 for Feb leap 2024', () => expect(getMonthDays('2024-02')).toBe(29))
  it('returns 30 for Apr', () => expect(getMonthDays('2026-04')).toBe(30))
  it('returns 31 for Dec', () => expect(getMonthDays('2026-12')).toBe(31))
})

describe('getWeekdayShort', () => {
  it('returns T5 for 2026-04-02', () => {
    // 2026-04-02 is Thursday (T5 in Vietnamese)
    expect(getWeekdayShort('2026-04', 2)).toBe('T5')
  })
  it('returns CN for a Sunday', () => {
    // 2026-04-05 is Sunday
    expect(getWeekdayShort('2026-04', 5)).toBe('CN')
  })
  it('returns labels within valid set', () => {
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    for (let d = 1; d <= 30; d++) {
      expect(labels).toContain(getWeekdayShort('2026-04', d))
    }
  })
})

describe('isSundayOf', () => {
  it('true for 2026-04-05', () => expect(isSundayOf('2026-04', 5)).toBe(true))
  it('false for 2026-04-06', () => expect(isSundayOf('2026-04', 6)).toBe(false))
})

describe('hashColor', () => {
  it('returns transparent for empty string', () => expect(hashColor('')).toBe('transparent'))
  it('is deterministic (same input → same color)', () => {
    expect(hashColor('Công trường A')).toBe(hashColor('Công trường A'))
  })
  it('different inputs → (likely) different hues', () => {
    const a = hashColor('Công trường A')
    const b = hashColor('Công trường Z')
    expect(a).not.toBe(b)
  })
  it('valid HSL format', () => {
    expect(hashColor('abc')).toMatch(/^hsl\(\d+, 65%, 55%\)$/)
  })
})

describe('cellKey / parseCellKey', () => {
  it('roundtrip', () => {
    const k = cellKey(42, 15)
    expect(k).toBe('42-15')
    expect(parseCellKey(k)).toEqual({ userId: 42, day: 15 })
  })
})

describe('dateOf', () => {
  it('formats day zero-padded', () => {
    expect(dateOf('2026-04', 5)).toBe('2026-04-05')
    expect(dateOf('2026-04', 31)).toBe('2026-04-31')
  })
})

describe('formatCoef', () => {
  it('empty for 0', () => expect(formatCoef(0)).toBe(''))
  it('integer 1', () => expect(formatCoef(1)).toBe('1'))
  it('half', () => expect(formatCoef(0.5)).toBe('0.5'))
  it('1.5', () => expect(formatCoef(1.5)).toBe('1.5'))
  it('strips trailing zeros', () => expect(formatCoef(1.25)).toBe('1.25'))
})

describe('computeWsBreakdown', () => {
  type Cell = { coefficient: number; worksiteId?: number }
  type Row = { userId: number; cells: Record<number, Cell> }
  const users = new Map<number, { dailyWage: number }>([
    [1, { dailyWage: 200_000 }],
    [2, { dailyWage: 180_000 }],
  ])
  const worksites = new Map<number, { dailyWage: number; name: string }>([
    [10, { dailyWage: 250_000, name: 'CT A' }],
    [20, { dailyWage: 0, name: 'CT B' }],
  ])

  it('groups by worksite and sums coef/salary', () => {
    const rows: Row[] = [
      { userId: 1, cells: { 1: { coefficient: 1, worksiteId: 10 }, 2: { coefficient: 0.5, worksiteId: 10 } } },
      { userId: 2, cells: { 1: { coefficient: 1, worksiteId: 20 }, 3: { coefficient: 1, worksiteId: 10 } } },
    ]
    const out = computeWsBreakdown(rows, users, worksites)
    const a = out.find((x) => x.wsId === 10)!
    const b = out.find((x) => x.wsId === 20)!
    expect(a.totalCoef).toBeCloseTo(2.5)
    // CT A override: 1*250k + 0.5*250k + 1*250k = 625k
    expect(a.totalSalary).toBeCloseTo(625_000)
    expect(b.totalCoef).toBeCloseTo(1)
    // CT B wage=0 → fallback user 2 dailyWage 180k
    expect(b.totalSalary).toBeCloseTo(180_000)
  })

  it('handles unassigned cells as "Chưa gán"', () => {
    const rows: Row[] = [
      { userId: 1, cells: { 5: { coefficient: 1 }, 6: { coefficient: 0.5, worksiteId: 10 } } },
    ]
    const out = computeWsBreakdown(rows, users, worksites)
    const unassigned = out.find((x) => x.wsId === null)!
    expect(unassigned.wsName).toBe('Chưa gán')
    expect(unassigned.totalCoef).toBeCloseTo(1)
    expect(unassigned.totalSalary).toBeCloseTo(200_000)
  })

  it('sorts by totalCoef descending', () => {
    const rows: Row[] = [
      { userId: 1, cells: { 1: { coefficient: 0.5, worksiteId: 10 }, 2: { coefficient: 3, worksiteId: 20 } } },
    ]
    const out = computeWsBreakdown(rows, users, worksites)
    expect(out[0].wsId).toBe(20)
    expect(out[1].wsId).toBe(10)
  })

  it('skips zero-coefficient cells', () => {
    const rows: Row[] = [
      { userId: 1, cells: { 1: { coefficient: 0, worksiteId: 10 }, 2: { coefficient: 1, worksiteId: 10 } } },
    ]
    const out = computeWsBreakdown(rows, users, worksites)
    expect(out).toHaveLength(1)
    expect(out[0].totalCoef).toBeCloseTo(1)
  })

  it('handles empty rows', () => {
    expect(computeWsBreakdown([] as Row[], users, worksites)).toEqual([])
  })

  it('grand totals match sum of breakdown', () => {
    const rows: Row[] = [
      { userId: 1, cells: { 1: { coefficient: 1, worksiteId: 10 }, 2: { coefficient: 1 } } },
      { userId: 2, cells: { 1: { coefficient: 0.5, worksiteId: 20 } } },
    ]
    const out = computeWsBreakdown(rows, users, worksites)
    const totalCoef = out.reduce((s, x) => s + x.totalCoef, 0)
    const totalSalary = out.reduce((s, x) => s + x.totalSalary, 0)
    // 1 (CT A, 250k) + 1 (unassigned u1, 200k) + 0.5 (CT B→u2 180k = 90k)
    expect(totalCoef).toBeCloseTo(2.5)
    expect(totalSalary).toBeCloseTo(250_000 + 200_000 + 90_000)
  })
})
