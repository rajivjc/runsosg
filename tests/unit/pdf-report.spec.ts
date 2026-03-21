import { calculateSummaryStats } from '@/lib/pdf-report'
import type { ExportSession } from '@/lib/export'

function makeSession(overrides: Partial<ExportSession> = {}): ExportSession {
  return {
    date: '15 Mar 2026',
    distance_km: 5,
    duration_min: 30,
    pace_min_km: '6:00',
    feel_rating: 4,
    coach_notes: 'Good session',
    source: 'manual',
    ...overrides,
  }
}

describe('calculateSummaryStats', () => {
  it('calculates correct totals', () => {
    const sessions = [
      makeSession({ distance_km: 5.0, duration_min: 30 }),
      makeSession({ distance_km: 3.5, duration_min: 25 }),
      makeSession({ distance_km: 7.0, duration_min: 45 }),
    ]

    const stats = calculateSummaryStats(sessions)
    expect(stats.totalSessions).toBe(3)
    expect(stats.totalDistanceKm).toBe(15.5)
  })

  it('calculates average pace correctly', () => {
    const sessions = [
      makeSession({ distance_km: 5, duration_min: 30 }),
      makeSession({ distance_km: 5, duration_min: 35 }),
    ]

    const stats = calculateSummaryStats(sessions)
    // 10km in 65min = 6.5 min/km = 6:30
    expect(stats.averagePace).toBe('6:30')
  })

  it('handles zero total distance', () => {
    const sessions = [
      makeSession({ distance_km: 0, duration_min: 10 }),
      makeSession({ distance_km: 0, duration_min: 15 }),
    ]

    const stats = calculateSummaryStats(sessions)
    expect(stats.averagePace).toBe('—')
  })

  it('formats date range from earliest to latest', () => {
    const sessions = [
      makeSession({ date: '15 Mar 2025' }),
      makeSession({ date: '10 Jan 2025' }),
      makeSession({ date: '20 Jun 2025' }),
    ]

    const stats = calculateSummaryStats(sessions)
    expect(stats.dateRange).toBe('Jan 2025 – Jun 2025')
  })

  it('handles single session date range', () => {
    const sessions = [
      makeSession({ date: '15 Mar 2025' }),
    ]

    const stats = calculateSummaryStats(sessions)
    expect(stats.dateRange).toBe('Mar 2025')
  })

  it('handles empty sessions array', () => {
    const stats = calculateSummaryStats([])
    expect(stats.totalSessions).toBe(0)
    expect(stats.totalDistanceKm).toBe(0)
    expect(stats.averagePace).toBe('—')
    expect(stats.dateRange).toBe('—')
  })
})
