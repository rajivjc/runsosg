import { formatDate, formatDateTime, formatDuration, formatDistance } from '@/lib/utils/dates'

describe('formatDate', () => {
  it('formats a date string in en-GB short month format (SGT)', () => {
    // 15 Mar 2026 UTC — in SGT (UTC+8) this is still 15 Mar
    const result = formatDate('2026-03-15')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2026/)
  })

  it('handles ISO datetime strings', () => {
    const result = formatDate('2026-01-01T00:00:00Z')
    // In SGT (UTC+8), midnight UTC on Jan 1 is 08:00 Jan 1
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })

  it('handles date near midnight UTC that shifts day in SGT', () => {
    // 20:00 UTC on Dec 31 → 04:00 Jan 1 SGT
    const result = formatDate('2025-12-31T20:00:00Z')
    expect(result).toMatch(/1/)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })
})

describe('formatDateTime', () => {
  it('includes time in the output', () => {
    const result = formatDateTime('2026-06-15T10:30:00Z')
    // 10:30 UTC = 18:30 SGT
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/18/)
    expect(result).toMatch(/30/)
  })
})

describe('formatDuration', () => {
  it('formats seconds under an hour as minutes', () => {
    expect(formatDuration(300)).toBe('5m')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(0)).toBe('0m')
  })

  it('formats seconds over an hour as hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
    expect(formatDuration(3660)).toBe('1h 1m')
    expect(formatDuration(7380)).toBe('2h 3m')
  })

  it('truncates partial minutes', () => {
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3601)).toBe('1h 0m')
  })
})

describe('formatDistance', () => {
  it('formats metres under 1000 as metres', () => {
    expect(formatDistance(500)).toBe('500m')
    expect(formatDistance(0)).toBe('0m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('formats metres >= 1000 as km with 2 decimal places', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
    expect(formatDistance(5000)).toBe('5.00 km')
    expect(formatDistance(1500)).toBe('1.50 km')
    expect(formatDistance(42195)).toBe('42.20 km')
  })
})
