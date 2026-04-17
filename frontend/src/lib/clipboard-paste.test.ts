import { describe, it, expect } from 'vitest'
import { parseHtml, parseTsv, coerceCoef, parseClipboard } from './clipboard-paste'

describe('coerceCoef', () => {
  it('returns null for empty / null', () => {
    expect(coerceCoef('')).toBeNull()
    expect(coerceCoef(null as any)).toBeNull()
  })
  it('parses integers', () => {
    expect(coerceCoef('1')).toBe(1)
    expect(coerceCoef('0')).toBe(0)
  })
  it('parses decimals with dot', () => {
    expect(coerceCoef('1.5')).toBe(1.5)
    expect(coerceCoef('0.5')).toBe(0.5)
  })
  it('parses decimals with comma (locale)', () => {
    expect(coerceCoef('1,5')).toBe(1.5)
    expect(coerceCoef('0,75')).toBe(0.75)
  })
  it('trims whitespace', () => {
    expect(coerceCoef('  1.5  ')).toBe(1.5)
  })
  it('rejects out-of-range', () => {
    expect(coerceCoef('-1')).toBeNull()
    expect(coerceCoef('3.1')).toBeNull()
    expect(coerceCoef('100')).toBeNull()
  })
  it('rejects non-numeric', () => {
    expect(coerceCoef('abc')).toBeNull()
    expect(coerceCoef('1.2.3')).toBeNull()
    expect(coerceCoef('1a')).toBeNull()
  })
  it('accepts boundary 3', () => {
    expect(coerceCoef('3')).toBe(3)
    expect(coerceCoef('3.0')).toBe(3)
  })
})

describe('parseHtml', () => {
  it('parses a simple table', () => {
    const html = '<table><tr><td>1</td><td>0.5</td></tr><tr><td>2</td><td></td></tr></table>'
    expect(parseHtml(html)).toEqual([['1', '0.5'], ['2', '']])
  })
  it('handles TH + TD mix', () => {
    const html = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'
    expect(parseHtml(html)).toEqual([['A', 'B'], ['1', '2']])
  })
  it('returns [] for invalid input', () => {
    expect(parseHtml('not a table')).toEqual([])
  })
  it('trims cell text', () => {
    const html = '<table><tr><td>  1  </td><td>\n2\n</td></tr></table>'
    expect(parseHtml(html)).toEqual([['1', '2']])
  })
})

describe('parseTsv', () => {
  it('parses tab-separated', () => {
    expect(parseTsv('1\t2\n3\t4')).toEqual([['1', '2'], ['3', '4']])
  })
  it('parses comma-separated (CSV) when no tabs', () => {
    expect(parseTsv('1,2\n3,4')).toEqual([['1', '2'], ['3', '4']])
  })
  it('handles CRLF', () => {
    expect(parseTsv('1\t2\r\n3\t4\r\n')).toEqual([['1', '2'], ['3', '4']])
  })
  it('skips empty lines', () => {
    expect(parseTsv('1\t2\n\n3\t4')).toEqual([['1', '2'], ['3', '4']])
  })
  it('trims cells', () => {
    expect(parseTsv(' 1 \t 2 ')).toEqual([['1', '2']])
  })
})

describe('parseClipboard', () => {
  it('returns [] for null dt', () => {
    expect(parseClipboard(null)).toEqual([])
  })
  it('prefers HTML table over text', () => {
    const dt = {
      getData: (t: string) => t === 'text/html' ? '<table><tr><td>H</td></tr></table>' : 'text-plain',
    } as unknown as DataTransfer
    expect(parseClipboard(dt)).toEqual([['H']])
  })
  it('falls back to TSV when HTML has no table', () => {
    const dt = {
      getData: (t: string) => t === 'text/html' ? '<div>no table</div>' : '1\t2\n3\t4',
    } as unknown as DataTransfer
    expect(parseClipboard(dt)).toEqual([['1', '2'], ['3', '4']])
  })
  it('returns [] when both empty', () => {
    const dt = { getData: () => '' } as unknown as DataTransfer
    expect(parseClipboard(dt)).toEqual([])
  })
})
