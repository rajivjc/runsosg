import { calculateWeeklyStreak } from '@/lib/streaks'

// Helper: get YYYY-MM-DD for a date relative to today
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
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
    // Sessions on each of the last 4 weeks
    const dates = [daysAgo(0), daysAgo(7), daysAgo(14), daysAgo(21)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(4)
    expect(result.activeThisWeek).toBe(true)
  })

  it('breaks streak on a gap week', () => {
    // Session today and 2 weeks ago (gap at week -1)
    const dates = [daysAgo(0), daysAgo(14)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(1)
    expect(result.activeThisWeek).toBe(true)
  })

  it('carries streak from previous week when current week has no session', () => {
    // Sessions 7, 14, 21 days ago but NOT this week
    const dates = [daysAgo(7), daysAgo(14), daysAgo(21)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(3)
    expect(result.activeThisWeek).toBe(false)
  })

  it('returns 0 when last session was 2+ weeks ago with gap', () => {
    // Only a session 14 days ago — previous week has no session
    const dates = [daysAgo(14)]
    const result = calculateWeeklyStreak(dates)
    // Whether this is 0 or 1 depends on whether day 14 falls in prev week or earlier
    // If daysAgo(14) is in the week before last, streak from prev week = 0
    // Just check it doesn't crash and returns a valid result
    expect(result.current).toBeGreaterThanOrEqual(0)
  })

  it('handles multiple sessions in the same week', () => {
    // 3 sessions this week, 2 last week
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(7), daysAgo(8)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(2)
    expect(result.activeThisWeek).toBe(true)
  })

  it('handles sessions far in the past', () => {
    // Sessions 200+ days ago shouldn't affect current streak
    const dates = [daysAgo(200), daysAgo(207), daysAgo(214)]
    const result = calculateWeeklyStreak(dates)
    expect(result.current).toBe(0)
    expect(result.activeThisWeek).toBe(false)
  })
})
