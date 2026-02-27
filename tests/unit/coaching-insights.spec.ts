import {
  detectFeelDecline,
  detectRecentPersonalBest,
  detectBestWeekEver,
  computeProgressComparison,
  type SessionForInsights,
} from '@/lib/analytics/coaching-insights'

function session(overrides: Partial<SessionForInsights> = {}): SessionForInsights {
  return {
    date: '2026-02-20',
    distance_km: 3.0,
    feel: 3,
    athlete_id: 'a1',
    ...overrides,
  }
}

// --- detectFeelDecline ---

describe('detectFeelDecline', () => {
  it('returns null for empty sessions', () => {
    expect(detectFeelDecline([])).toBeNull()
  })

  it('returns null with insufficient data in either window', () => {
    // Only 1 session in recent window
    const sessions = [
      session({ date: '2026-02-20', feel: 2 }),
      session({ date: '2026-02-01', feel: 4 }),
      session({ date: '2026-01-30', feel: 4 }),
    ]
    expect(detectFeelDecline(sessions)).toBeNull()
  })

  it('detects a significant feel decline (>= 1.0 drop)', () => {
    const sessions = [
      // Recent window (last 14 days)
      session({ date: '2026-02-24', feel: 2 }),
      session({ date: '2026-02-22', feel: 1 }),
      session({ date: '2026-02-20', feel: 2 }),
      // Prior window (14-28 days ago)
      session({ date: '2026-02-10', feel: 4 }),
      session({ date: '2026-02-08', feel: 5 }),
      session({ date: '2026-02-06', feel: 4 }),
    ]
    const result = detectFeelDecline(sessions)
    expect(result).not.toBeNull()
    expect(result!.delta).toBeLessThanOrEqual(-1.0)
    expect(result!.avgRecent).toBeLessThan(result!.avgPrior)
  })

  it('returns null when decline is minor (< 1.0)', () => {
    const sessions = [
      session({ date: '2026-02-24', feel: 3 }),
      session({ date: '2026-02-22', feel: 3 }),
      session({ date: '2026-02-10', feel: 4 }),
      session({ date: '2026-02-08', feel: 3 }),
    ]
    expect(detectFeelDecline(sessions)).toBeNull()
  })

  it('returns null when feel is improving', () => {
    const sessions = [
      session({ date: '2026-02-24', feel: 5 }),
      session({ date: '2026-02-22', feel: 4 }),
      session({ date: '2026-02-10', feel: 2 }),
      session({ date: '2026-02-08', feel: 1 }),
    ]
    expect(detectFeelDecline(sessions)).toBeNull()
  })

  it('skips sessions with null feel', () => {
    const sessions = [
      session({ date: '2026-02-24', feel: 2 }),
      session({ date: '2026-02-22', feel: null }),
      session({ date: '2026-02-20', feel: 1 }),
      session({ date: '2026-02-10', feel: 5 }),
      session({ date: '2026-02-08', feel: null }),
      session({ date: '2026-02-06', feel: 4 }),
    ]
    const result = detectFeelDecline(sessions)
    expect(result).not.toBeNull()
    expect(result!.avgRecent).toBeLessThan(3)
  })

  it('rounds averages to 1 decimal', () => {
    const sessions = [
      session({ date: '2026-02-24', feel: 1 }),
      session({ date: '2026-02-22', feel: 2 }),
      session({ date: '2026-02-20', feel: 1 }),
      session({ date: '2026-02-10', feel: 4 }),
      session({ date: '2026-02-08', feel: 5 }),
      session({ date: '2026-02-06', feel: 4 }),
    ]
    const result = detectFeelDecline(sessions)
    expect(result).not.toBeNull()
    // Check values are rounded (no more than 1 decimal)
    expect(String(result!.avgRecent).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1)
    expect(String(result!.avgPrior).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1)
  })
})

// --- detectRecentPersonalBest ---

describe('detectRecentPersonalBest', () => {
  it('returns null for empty sessions', () => {
    expect(detectRecentPersonalBest([])).toBeNull()
  })

  it('returns null for single session', () => {
    expect(detectRecentPersonalBest([session()])).toBeNull()
  })

  it('detects when most recent session is a distance PB', () => {
    const sessions = [
      session({ date: '2026-02-25', distance_km: 5.0 }),
      session({ date: '2026-02-20', distance_km: 3.0 }),
      session({ date: '2026-02-15', distance_km: 4.0 }),
    ]
    const result = detectRecentPersonalBest(sessions)
    expect(result).not.toBeNull()
    expect(result!.distanceKm).toBe(5.0)
    expect(result!.previousBestKm).toBe(4.0)
    expect(result!.date).toBe('2026-02-25')
  })

  it('returns null when most recent session is NOT a PB', () => {
    const sessions = [
      session({ date: '2026-02-25', distance_km: 2.0 }),
      session({ date: '2026-02-20', distance_km: 5.0 }),
    ]
    expect(detectRecentPersonalBest(sessions)).toBeNull()
  })

  it('ignores sessions with null distance', () => {
    const sessions = [
      session({ date: '2026-02-25', distance_km: null }),
      session({ date: '2026-02-20', distance_km: 3.0 }),
      session({ date: '2026-02-15', distance_km: 2.0 }),
    ]
    // Latest with distance (2026-02-20 at 3.0) is PB over 2.0
    const result = detectRecentPersonalBest(sessions)
    expect(result).not.toBeNull()
    expect(result!.distanceKm).toBe(3.0)
  })

  it('rounds distances to 1 decimal', () => {
    const sessions = [
      session({ date: '2026-02-25', distance_km: 5.678 }),
      session({ date: '2026-02-20', distance_km: 3.123 }),
    ]
    const result = detectRecentPersonalBest(sessions)
    expect(result).not.toBeNull()
    expect(result!.distanceKm).toBe(5.7)
    expect(result!.previousBestKm).toBe(3.1)
  })

  it('detects marginal PB', () => {
    const sessions = [
      session({ date: '2026-02-25', distance_km: 3.01 }),
      session({ date: '2026-02-20', distance_km: 3.00 }),
    ]
    const result = detectRecentPersonalBest(sessions)
    expect(result).not.toBeNull()
  })
})

// --- detectBestWeekEver ---

describe('detectBestWeekEver', () => {
  it('returns null for empty sessions', () => {
    expect(detectBestWeekEver([])).toBeNull()
  })

  it('returns null for single week of data', () => {
    const monday = getRecentMonday()
    const sessions = [
      session({ date: monday, distance_km: 5.0 }),
      session({ date: addDays(monday, 1), distance_km: 3.0 }),
    ]
    expect(detectBestWeekEver(sessions)).toBeNull()
  })

  it('detects best week when current week exceeds all prior', () => {
    const monday = getRecentMonday()
    const prevMonday = addDays(monday, -7)
    const sessions = [
      // Current week: 10km total
      session({ date: monday, distance_km: 5.0 }),
      session({ date: addDays(monday, 2), distance_km: 5.0 }),
      // Previous week: 6km total
      session({ date: prevMonday, distance_km: 3.0 }),
      session({ date: addDays(prevMonday, 1), distance_km: 3.0 }),
    ]
    const result = detectBestWeekEver(sessions)
    expect(result).not.toBeNull()
    expect(result!.thisWeekKm).toBe(10.0)
    expect(result!.previousBestWeekKm).toBe(6.0)
  })

  it('returns null when current week is NOT the best', () => {
    const monday = getRecentMonday()
    const prevMonday = addDays(monday, -7)
    const sessions = [
      // Current week: 4km
      session({ date: monday, distance_km: 4.0 }),
      // Previous week: 10km
      session({ date: prevMonday, distance_km: 10.0 }),
    ]
    expect(detectBestWeekEver(sessions)).toBeNull()
  })

  it('returns null when current week has no sessions', () => {
    const prevMonday = addDays(getRecentMonday(), -7)
    const sessions = [
      session({ date: prevMonday, distance_km: 5.0 }),
      session({ date: addDays(prevMonday, -7), distance_km: 3.0 }),
    ]
    expect(detectBestWeekEver(sessions)).toBeNull()
  })

  it('handles null distances gracefully', () => {
    const monday = getRecentMonday()
    const prevMonday = addDays(monday, -7)
    const sessions = [
      session({ date: monday, distance_km: 5.0 }),
      session({ date: monday, distance_km: null }),
      session({ date: prevMonday, distance_km: 3.0 }),
    ]
    const result = detectBestWeekEver(sessions)
    expect(result).not.toBeNull()
    expect(result!.thisWeekKm).toBe(5.0)
  })
})

// --- computeProgressComparison ---

describe('computeProgressComparison', () => {
  it('returns null for empty sessions', () => {
    expect(computeProgressComparison([])).toBeNull()
  })

  it('returns null with fewer than 4 sessions', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 1.0 }),
      session({ date: '2026-02-15', distance_km: 2.0 }),
      session({ date: '2026-02-25', distance_km: 3.0 }),
    ]
    expect(computeProgressComparison(sessions)).toBeNull()
  })

  it('returns null when data span is less than 30 days', () => {
    const sessions = [
      session({ date: '2026-02-10', distance_km: 1.0 }),
      session({ date: '2026-02-15', distance_km: 2.0 }),
      session({ date: '2026-02-20', distance_km: 3.0 }),
      session({ date: '2026-02-25', distance_km: 4.0 }),
    ]
    expect(computeProgressComparison(sessions)).toBeNull()
  })

  it('detects meaningful improvement (>= 20%)', () => {
    const sessions = [
      // Early sessions (low distance)
      session({ date: '2025-10-01', distance_km: 1.0 }),
      session({ date: '2025-10-10', distance_km: 1.2 }),
      session({ date: '2025-10-20', distance_km: 1.1 }),
      // Recent sessions (higher distance)
      session({ date: '2026-02-01', distance_km: 3.0 }),
      session({ date: '2026-02-10', distance_km: 3.5 }),
      session({ date: '2026-02-20', distance_km: 3.2 }),
    ]
    const result = computeProgressComparison(sessions)
    expect(result).not.toBeNull()
    expect(result!.improvementPct).toBeGreaterThanOrEqual(20)
    expect(result!.recentAvgKm).toBeGreaterThan(result!.earlyAvgKm)
    expect(result!.monthsOfData).toBeGreaterThan(0)
  })

  it('returns null when improvement is less than 20%', () => {
    const sessions = [
      session({ date: '2025-12-01', distance_km: 3.0 }),
      session({ date: '2025-12-10', distance_km: 3.1 }),
      session({ date: '2025-12-20', distance_km: 3.0 }),
      session({ date: '2026-02-01', distance_km: 3.2 }),
      session({ date: '2026-02-10', distance_km: 3.3 }),
      session({ date: '2026-02-20', distance_km: 3.1 }),
    ]
    expect(computeProgressComparison(sessions)).toBeNull()
  })

  it('ignores sessions with null or zero distance', () => {
    const sessions = [
      session({ date: '2025-10-01', distance_km: null }),
      session({ date: '2025-10-10', distance_km: 0 }),
      session({ date: '2025-10-15', distance_km: 1.0 }),
      session({ date: '2025-10-20', distance_km: 1.2 }),
      session({ date: '2026-02-01', distance_km: 3.0 }),
      session({ date: '2026-02-15', distance_km: 3.5 }),
    ]
    const result = computeProgressComparison(sessions)
    expect(result).not.toBeNull()
  })

  it('returns correct monthsOfData', () => {
    const sessions = [
      session({ date: '2025-11-01', distance_km: 1.0 }),
      session({ date: '2025-11-15', distance_km: 1.2 }),
      session({ date: '2026-02-01', distance_km: 3.0 }),
      session({ date: '2026-02-15', distance_km: 3.5 }),
    ]
    const result = computeProgressComparison(sessions)
    expect(result).not.toBeNull()
    expect(result!.monthsOfData).toBeGreaterThanOrEqual(3)
  })
})

// --- Helpers ---

function getRecentMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  return monday.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
