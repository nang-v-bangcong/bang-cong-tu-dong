import { describe, it, expect } from 'vitest'
import { snapshotCells } from './matrix-history'
import type { models } from '../../wailsjs/go/models'

const makeMatrix = (): models.TeamMatrix => ({
  yearMonth: '2026-04',
  daysInMonth: 30,
  dayNotes: {},
  dayTotals: {},
  rows: [
    {
      userId: 1, userName: 'Alice', totalDays: 2, totalCoef: 2, salary: 400000,
      cells: {
        1: { attendanceId: 100, coefficient: 1, worksiteId: 10, worksiteName: 'A', note: '' },
        5: { attendanceId: 101, coefficient: 1.5, worksiteId: null as any, worksiteName: '', note: '' },
      },
    },
    {
      userId: 2, userName: 'Bob', totalDays: 0, totalCoef: 0, salary: 0,
      cells: {},
    },
  ],
} as unknown as models.TeamMatrix)

describe('snapshotCells', () => {
  it('captures filled cell with worksite', () => {
    const snaps = snapshotCells(makeMatrix(), [{ userId: 1, day: 1 }])
    expect(snaps).toEqual([{ userId: 1, day: 1, state: { coef: 1, wsID: 10 } }])
  })

  it('captures filled cell without worksite', () => {
    const snaps = snapshotCells(makeMatrix(), [{ userId: 1, day: 5 }])
    expect(snaps).toEqual([{ userId: 1, day: 5, state: { coef: 1.5, wsID: null } }])
  })

  it('captures empty cell as null state', () => {
    const snaps = snapshotCells(makeMatrix(), [{ userId: 1, day: 10 }])
    expect(snaps).toEqual([{ userId: 1, day: 10, state: null }])
  })

  it('captures unknown user as null state', () => {
    const snaps = snapshotCells(makeMatrix(), [{ userId: 999, day: 1 }])
    expect(snaps).toEqual([{ userId: 999, day: 1, state: null }])
  })

  it('captures multiple cells in order', () => {
    const snaps = snapshotCells(makeMatrix(), [
      { userId: 1, day: 1 },
      { userId: 2, day: 1 },
      { userId: 1, day: 5 },
    ])
    expect(snaps.length).toBe(3)
    expect(snaps[0].state?.coef).toBe(1)
    expect(snaps[1].state).toBeNull()
    expect(snaps[2].state?.coef).toBe(1.5)
  })
})
