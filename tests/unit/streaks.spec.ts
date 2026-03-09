import { calculateWeeklyStreak, calculateStreakDetails } from '@/lib/streaks'

// Helper: get YYYY-MM-DD for a date relative to today
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

/**
 * Week-aware date helper. Returns a YYYY-MM-DD string for a specific day
 * within the current or a past ISO week (Mon–Sun).
 *
 * @param weekOffset  0 = this week, 1 = last week, 2 = two weeks ago, etc.
 * @param dayOfWeek   0 = Mon, 1 = Tue, … 6 = Sun (ISO convention)
 */
function dayInWeek(weekOffset: number, dayOfWeek: number = 0): string {
  const now = new Date()
  const utcDow = now.getUTCDay() // 0=Sun, 1=Mon…6=Sat
  const diffToMon = utcDow === 0 ? 6 : utcDow - 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMon))
  monday.setUTCDate(monday.getUTCDate() - weekOffset * 7 + dayOfWeek)
  return monday.toISOString().split('T')[0]
}

describe('calculateWeeklyStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(calculateWeeklyStreak([])).toEqual({ current: 0, activeThisWeek: false })
  })

  it('returns 1-week streak for a session today', () => {
    const result = calculateWeeklyStreak([daysAgo(0)])
    expect(result.current).toBe(1)
    expect(result.activeThisWeek).toBe(true)
  })

  it('counts consecutive weeks correctly', () => {
    // One session in each of the last 4 weeks (all on Monday)
    const dates = [dayInWeek(0), dayInWeek(1), dayInWeek(2), dayInWeek(3)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(4)
    expect(result.activeThisWeek).toBe(true)
  })

  it('breaks streak on a gap week', () => {
    // Session this week and 2 weeks ago (gap at week -1)
    const dates = [dayInWeek(0), dayInWeek(2)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(1)
    expect(result.activeThisWeek).toBe(true)
  })

  it('carries streak from previous week when current week has no session', () => {
    // Sessions in weeks -1, -2, -3 but NOT this week
    const dates = [dayInWeek(1), dayInWeek(2), dayInWeek(3)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(3)
    expect(result.activeThisWeek).toBe(false)
  })

  it('returns 0 when last session was 2+ weeks ago with gap', () => {
    // Only a session 3 weeks ago — previous week has no session
    const dates = [dayInWeek(3)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(0)
    expect(result.activeThisWeek).toBe(false)
  })

  it('handles multiple sessions in the same week', () => {
    // 3 sessions this week (Mon, Tue, Wed), 2 last week (Mon, Tue)
    const dates = [
      dayInWeek(0, 0), dayInWeek(0, 1), dayInWeek(0, 2),
      dayInWeek(1, 0), dayInWeek(1, 1),
    ]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(2)
    expect(result.activeThisWeek).toBe(true)
  })

  it('handles sessions far in the past', () => {
    // Sessions 30+ weeks ago shouldn't affect current streak
    const dates = [dayInWeek(30), dayInWeek(31), dayInWeek(32)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(0)
    expect(result.activeThisWeek).toBe(false)
  })
})

describe('calculateStreakDetails', () => {
  it('returns zeros and empty activity for no sessions', () => {
    const result = calculateStreakDetails([])
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
    expect(result.activeThisWeek).toBe(false)
    expect(result.weeklyActivity).toHaveLength(12)
    expect(result.weeklyActivity.every(w => !w.active)).toBe(true)
  })

  it('returns correct current and longest for consecutive weeks', () => {
    const dates = [dayInWeek(0), dayInWeek(1), dayInWeek(2), dayInWeek(3)]
    const result = calculateStreakDetails(dates)
    expect(result.current).toBe(4)
    expect(result.longest).toBe(4)
    expect(result.activeThisWeek).toBe(true)
  })

  it('tracks longest streak across a gap', () => {
    // Weeks 0,1 (2-week current) + weeks 4,5,6,7,8 (5-week older streak)
    const dates = [
      dayInWeek(0), dayInWeek(1),
      dayInWeek(4), dayInWeek(5), dayInWeek(6), dayInWeek(7), dayInWeek(8),
    ]
    const result = calculateStreakDetails(dates)
    expect(result.current).toBe(2)
    expect(result.longest).toBe(5)
  })

  it('weeklyActivity has correct length and marks active weeks', () => {
    const dates = [dayInWeek(0), dayInWeek(2), dayInWeek(5)]
    const result = calculateStreakDetails(dates, 8)
    expect(result.weeklyActivity).toHaveLength(8)
    // Most recent week (index 7) = active
    expect(result.weeklyActivity[7].active).toBe(true)
    // 2 weeks ago (index 5) = active
    expect(result.weeklyActivity[5].active).toBe(true)
    // 5 weeks ago (index 2) = active
    expect(result.weeklyActivity[2].active).toBe(true)
    // Others inactive
    expect(result.weeklyActivity[6].active).toBe(false)
    expect(result.weeklyActivity[4].active).toBe(false)
  })

  it('handles all weeks active', () => {
    const dates = Array.from({ length: 12 }, (_, i) => dayInWeek(i))
    const result = calculateStreakDetails(dates)
    expect(result.current).toBe(12)
    expect(result.longest).toBe(12)
    expect(result.weeklyActivity.every(w => w.active)).toBe(true)
  })

  it('longest is at least 1 when any sessions exist', () => {
    const dates = [dayInWeek(5)]
    const result = calculateStreakDetails(dates)
    expect(result.longest).toBe(1)
  })

  it('carries streak from previous week when current week inactive', () => {
    const dates = [dayInWeek(1), dayInWeek(2), dayInWeek(3)]
    const result = calculateStreakDetails(dates)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
    expect(result.activeThisWeek).toBe(false)
  })
})
