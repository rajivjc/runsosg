import {
  computeWeeklyVolume,
  computeFeelTrend,
  computeDistanceTimeline,
  computePersonalBests,
  type SessionForTrends,
} from '@/lib/analytics/session-trends'

function session(overrides: Partial<SessionForTrends> = {}): SessionForTrends {
  return {
    date: '2026-02-20',
    distance_km: 3.0,
    duration_seconds: 1200,
    feel: 3,
    ...overrides,
  }
}

// --- computeWeeklyVolume ---

describe('computeWeeklyVolume', () => {
  it('returns empty weeks for no sessions', () => {
    const weeks = computeWeeklyVolume([], 4)
    expect(weeks).toHaveLength(4)
    expect(weeks.every(w => w.totalKm === 0)).toBe(true)
    expect(weeks.every(w => w.sessionCount === 0)).toBe(true)
  })

  it('aggregates distance into correct week buckets', () => {
    // Two sessions in the same week
    const monday = getRecentMonday()
    const tuesday = addDays(monday, 1)
    const sessions = [
      session({ date: monday, distance_km: 2.5 }),
      session({ date: tuesday, distance_km: 3.0 }),
    ]
    const weeks = computeWeeklyVolume(sessions, 4)
    const currentWeek = weeks[weeks.length - 1]
    expect(currentWeek.totalKm).toBe(5.5)
    expect(currentWeek.sessionCount).toBe(2)
  })

  it('handles null distance_km gracefully', () => {
    const monday = getRecentMonday()
    const sessions = [
      session({ date: monday, distance_km: null }),
      session({ date: monday, distance_km: 2.0 }),
    ]
    const weeks = computeWeeklyVolume(sessions, 4)
    const currentWeek = weeks[weeks.length - 1]
    expect(currentWeek.totalKm).toBe(2.0)
    expect(currentWeek.sessionCount).toBe(2)
  })

  it('ignores sessions before the window', () => {
    const sessions = [
      session({ date: '2020-01-01', distance_km: 5.0 }),
    ]
    const weeks = computeWeeklyVolume(sessions, 4)
    expect(weeks.every(w => w.totalKm === 0)).toBe(true)
  })

  it('rounds totals to 1 decimal place', () => {
    const monday = getRecentMonday()
    const sessions = [
      session({ date: monday, distance_km: 1.15 }),
      session({ date: monday, distance_km: 2.17 }),
    ]
    const weeks = computeWeeklyVolume(sessions, 4)
    const currentWeek = weeks[weeks.length - 1]
    // 1.15 + 2.17 = 3.32, rounded to 3.3
    expect(currentWeek.totalKm).toBe(3.3)
  })

  it('has the correct number of weeks', () => {
    expect(computeWeeklyVolume([], 1)).toHaveLength(1)
    expect(computeWeeklyVolume([], 12)).toHaveLength(12)
    expect(computeWeeklyVolume([], 8)).toHaveLength(8)
  })

  it('weeks are in chronological order', () => {
    const weeks = computeWeeklyVolume([], 4)
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i].weekStart > weeks[i - 1].weekStart).toBe(true)
    }
  })

  it('distributes sessions across different weeks', () => {
    const monday = getRecentMonday()
    const prevMonday = addDays(monday, -7)
    const sessions = [
      session({ date: monday, distance_km: 2.0 }),
      session({ date: prevMonday, distance_km: 3.0 }),
    ]
    const weeks = computeWeeklyVolume(sessions, 4)
    const lastWeek = weeks[weeks.length - 1]
    const prevWeek = weeks[weeks.length - 2]
    expect(lastWeek.totalKm).toBe(2.0)
    expect(prevWeek.totalKm).toBe(3.0)
  })
})

// --- computeFeelTrend ---

describe('computeFeelTrend', () => {
  it('returns empty array for no sessions', () => {
    expect(computeFeelTrend([])).toEqual([])
  })

  it('filters out sessions without feel', () => {
    const sessions = [
      session({ date: '2026-02-01', feel: 3 }),
      session({ date: '2026-02-02', feel: null }),
      session({ date: '2026-02-03', feel: 5 }),
    ]
    const trend = computeFeelTrend(sessions)
    expect(trend).toHaveLength(2)
    expect(trend[0].feel).toBe(3)
    expect(trend[1].feel).toBe(5)
  })

  it('sorts by date ascending', () => {
    const sessions = [
      session({ date: '2026-02-10', feel: 4 }),
      session({ date: '2026-02-01', feel: 2 }),
      session({ date: '2026-02-05', feel: 3 }),
    ]
    const trend = computeFeelTrend(sessions)
    expect(trend[0].date).toBe('2026-02-01')
    expect(trend[1].date).toBe('2026-02-05')
    expect(trend[2].date).toBe('2026-02-10')
  })

  it('includes dateLabel for each point', () => {
    const sessions = [session({ date: '2026-02-15', feel: 4 })]
    const trend = computeFeelTrend(sessions)
    expect(trend[0].dateLabel).toBeTruthy()
    expect(typeof trend[0].dateLabel).toBe('string')
  })

  it('handles all feel values (1-5)', () => {
    const sessions = [1, 2, 3, 4, 5].map((f, i) =>
      session({ date: `2026-02-0${i + 1}`, feel: f })
    )
    const trend = computeFeelTrend(sessions)
    expect(trend).toHaveLength(5)
    expect(trend.map(t => t.feel)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns empty array when all feels are null', () => {
    const sessions = [
      session({ date: '2026-02-01', feel: null }),
      session({ date: '2026-02-02', feel: null }),
    ]
    expect(computeFeelTrend(sessions)).toEqual([])
  })
})

// --- computeDistanceTimeline ---

describe('computeDistanceTimeline', () => {
  it('returns empty array for no sessions', () => {
    expect(computeDistanceTimeline([])).toEqual([])
  })

  it('filters out sessions without distance', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 2.0 }),
      session({ date: '2026-02-02', distance_km: null }),
      session({ date: '2026-02-03', distance_km: 0 }),
      session({ date: '2026-02-04', distance_km: 3.0 }),
    ]
    const timeline = computeDistanceTimeline(sessions)
    expect(timeline).toHaveLength(2) // 0km filtered out
    expect(timeline[0].distanceKm).toBe(2.0)
    expect(timeline[1].distanceKm).toBe(3.0)
  })

  it('computes cumulative distance', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 2.0 }),
      session({ date: '2026-02-05', distance_km: 3.0 }),
      session({ date: '2026-02-10', distance_km: 1.5 }),
    ]
    const timeline = computeDistanceTimeline(sessions)
    expect(timeline[0].cumulativeKm).toBe(2.0)
    expect(timeline[1].cumulativeKm).toBe(5.0)
    expect(timeline[2].cumulativeKm).toBe(6.5)
  })

  it('sorts by date ascending', () => {
    const sessions = [
      session({ date: '2026-02-10', distance_km: 1.0 }),
      session({ date: '2026-02-01', distance_km: 2.0 }),
      session({ date: '2026-02-05', distance_km: 3.0 }),
    ]
    const timeline = computeDistanceTimeline(sessions)
    expect(timeline[0].date).toBe('2026-02-01')
    expect(timeline[1].date).toBe('2026-02-05')
    expect(timeline[2].date).toBe('2026-02-10')
  })

  it('rounds distanceKm to 1 decimal', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 2.456 }),
    ]
    const timeline = computeDistanceTimeline(sessions)
    expect(timeline[0].distanceKm).toBe(2.5)
  })

  it('handles single session', () => {
    const sessions = [session({ date: '2026-02-01', distance_km: 5.0 })]
    const timeline = computeDistanceTimeline(sessions)
    expect(timeline).toHaveLength(1)
    expect(timeline[0].distanceKm).toBe(5.0)
    expect(timeline[0].cumulativeKm).toBe(5.0)
  })
})

// --- computePersonalBests ---

describe('computePersonalBests', () => {
  it('returns empty array for no sessions', () => {
    expect(computePersonalBests([])).toEqual([])
  })

  it('finds longest distance', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 2.0 }),
      session({ date: '2026-02-05', distance_km: 5.0 }),
      session({ date: '2026-02-10', distance_km: 3.0 }),
    ]
    const bests = computePersonalBests(sessions)
    const distanceBest = bests.find(b => b.metric === 'distance')
    expect(distanceBest).toBeDefined()
    expect(distanceBest!.value).toBe(5.0)
    expect(distanceBest!.date).toBe('2026-02-05')
    expect(distanceBest!.previousBest).toBe(2.0) // was 2.0 before 5.0
  })

  it('finds longest duration', () => {
    const sessions = [
      session({ date: '2026-02-01', duration_seconds: 600 }),
      session({ date: '2026-02-05', duration_seconds: 1800 }),
      session({ date: '2026-02-10', duration_seconds: 900 }),
    ]
    const bests = computePersonalBests(sessions)
    const durationBest = bests.find(b => b.metric === 'duration')
    expect(durationBest).toBeDefined()
    expect(durationBest!.value).toBe(1800)
    expect(durationBest!.previousBest).toBe(600)
  })

  it('returns null previousBest for first-ever session', () => {
    const sessions = [session({ date: '2026-02-01', distance_km: 3.0, duration_seconds: 1200 })]
    const bests = computePersonalBests(sessions)
    const distanceBest = bests.find(b => b.metric === 'distance')
    expect(distanceBest!.previousBest).toBeNull()
  })

  it('handles sessions with null values', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: null, duration_seconds: null }),
      session({ date: '2026-02-02', distance_km: 2.0, duration_seconds: 600 }),
    ]
    const bests = computePersonalBests(sessions)
    const distanceBest = bests.find(b => b.metric === 'distance')
    expect(distanceBest!.value).toBe(2.0)
    expect(distanceBest!.previousBest).toBeNull()
  })

  it('includes formatted values', () => {
    const sessions = [session({ date: '2026-02-01', distance_km: 5.25, duration_seconds: 1800 })]
    const bests = computePersonalBests(sessions)
    const distanceBest = bests.find(b => b.metric === 'distance')
    expect(distanceBest!.formattedValue).toBe('5.25 km')
    const durationBest = bests.find(b => b.metric === 'duration')
    expect(durationBest!.formattedValue).toBe('30m')
  })

  it('handles progressively improving distances', () => {
    const sessions = [
      session({ date: '2026-02-01', distance_km: 1.0 }),
      session({ date: '2026-02-05', distance_km: 2.0 }),
      session({ date: '2026-02-10', distance_km: 3.0 }),
      session({ date: '2026-02-15', distance_km: 4.0 }),
    ]
    const bests = computePersonalBests(sessions)
    const distanceBest = bests.find(b => b.metric === 'distance')
    expect(distanceBest!.value).toBe(4.0)
    expect(distanceBest!.previousBest).toBe(3.0)
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
