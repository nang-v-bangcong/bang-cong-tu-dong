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
