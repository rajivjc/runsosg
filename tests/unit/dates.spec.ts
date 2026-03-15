import { formatDate, formatDateTime, formatDuration, formatDistance, formatPace } from '@/lib/utils/dates'

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

describe('formatPace', () => {
  it('calculates pace from distance and duration', () => {
    // 2km in 1200s = 600s/km = 10:00/km
    expect(formatPace(2, 1200)).toBe('10:00/km')
  })

  it('formats seconds with leading zero', () => {
    // 3km in 900s = 300s/km = 5:00/km
    expect(formatPace(3, 900)).toBe('5:00/km')
    // 1km in 365s = 6:05/km
    expect(formatPace(1, 365)).toBe('6:05/km')
  })

  it('handles typical running paces', () => {
    // 2.1km in 1200s (20min) = ~571s/km = 9:31/km
    expect(formatPace(2.1, 1200)).toBe('9:31/km')
  })

  it('returns null for zero distance', () => {
    expect(formatPace(0, 1200)).toBeNull()
  })

  it('returns null for zero duration', () => {
    expect(formatPace(2, 0)).toBeNull()
  })

  it('returns null for null values', () => {
    expect(formatPace(null, 1200)).toBeNull()
    expect(formatPace(2, null)).toBeNull()
    expect(formatPace(null, null)).toBeNull()
  })

  it('returns null for undefined values', () => {
    expect(formatPace(undefined, 1200)).toBeNull()
    expect(formatPace(2, undefined)).toBeNull()
  })

  it('returns null for negative values', () => {
    expect(formatPace(-1, 1200)).toBeNull()
    expect(formatPace(2, -100)).toBeNull()
  })
})
