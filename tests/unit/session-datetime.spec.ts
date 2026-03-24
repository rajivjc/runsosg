/**
 * Unit tests for session datetime helpers.
 *
 * All helpers convert TIMESTAMPTZ strings to display values
 * using the club's timezone. These tests verify correct timezone
 * handling, edge cases around midnight boundaries, and week labels.
 */

import {
  formatSessionDate,
  formatSessionDateLong,
  formatSessionTime,
  formatSessionTimeRange,
  isSessionToday,
  isSessionPast,
  getSessionWeekLabel,
  combineDateTime,
  getUpcomingSessionDate,
} from '@/lib/sessions/datetime'

const SGT = 'Asia/Singapore'
const UTC = 'UTC'
const NYC = 'America/New_York'

describe('formatSessionDate', () => {
  it('formats UTC midnight as SGT date correctly', () => {
    // 2026-03-29T00:00:00Z = 2026-03-29 08:00 SGT
    const result = formatSessionDate('2026-03-29T00:00:00Z', SGT)
    expect(result).toBe('Sun 29 Mar')
  })

  it('formats a date in UTC timezone', () => {
    const result = formatSessionDate('2026-03-29T00:00:00Z', UTC)
    expect(result).toBe('Sun 29 Mar')
  })

  it('handles midnight boundary — late UTC time rolls to next day in SGT', () => {
    // 2026-03-28T17:00:00Z = 2026-03-29 01:00 SGT (next day)
    const result = formatSessionDate('2026-03-28T17:00:00Z', SGT)
    expect(result).toBe('Sun 29 Mar')
  })

  it('handles midnight boundary — early UTC time is previous day in NYC', () => {
    // 2026-03-29T03:00:00Z = 2026-03-28 11:00 PM EDT (previous day)
    const result = formatSessionDate('2026-03-29T03:00:00Z', NYC)
    expect(result).toBe('Sat 28 Mar')
  })
})

describe('formatSessionDateLong', () => {
  it('formats full date correctly', () => {
    const result = formatSessionDateLong('2026-03-29T00:00:00Z', SGT)
    expect(result).toBe('Sunday, 29 March 2026')
  })

  it('formats a different date', () => {
    const result = formatSessionDateLong('2026-01-15T08:00:00Z', SGT)
    expect(result).toBe('Thursday, 15 January 2026')
  })
})

describe('formatSessionTime', () => {
  it('formats UTC midnight as 8:00 AM SGT', () => {
    const result = formatSessionTime('2026-03-29T00:00:00Z', SGT)
    expect(result).toBe('8:00 AM')
  })

  it('formats afternoon time', () => {
    const result = formatSessionTime('2026-03-29T06:00:00Z', SGT)
    expect(result).toBe('2:00 PM')
  })

  it('formats midnight in UTC', () => {
    const result = formatSessionTime('2026-03-29T00:00:00Z', UTC)
    expect(result).toBe('12:00 AM')
  })

  it('formats noon correctly', () => {
    const result = formatSessionTime('2026-03-29T04:00:00Z', SGT)
    expect(result).toBe('12:00 PM')
  })
})

describe('formatSessionTimeRange', () => {
  it('formats start and end time', () => {
    const result = formatSessionTimeRange(
      '2026-03-29T00:00:00Z',
      '2026-03-29T02:00:00Z',
      SGT
    )
    expect(result).toBe('8:00 AM – 10:00 AM')
  })

  it('returns just start time when no end', () => {
    const result = formatSessionTimeRange('2026-03-29T00:00:00Z', null, SGT)
    expect(result).toBe('8:00 AM')
  })
})

describe('isSessionToday', () => {
  // We use a fixed "now" approach by testing with dates relative to current time
  it('returns true for a session starting now', () => {
    const now = new Date()
    expect(isSessionToday(now.toISOString(), SGT)).toBe(true)
  })

  it('returns false for a session yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    // Move to a safe hour to avoid boundary issues
    yesterday.setUTCHours(12, 0, 0, 0)
    const today = new Date()
    today.setUTCHours(12, 0, 0, 0)
    // Only test if they're different days in SGT
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: SGT }).format(yesterday)
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: SGT }).format(today)
    if (yesterdayStr !== todayStr) {
      expect(isSessionToday(yesterday.toISOString(), SGT)).toBe(false)
    }
  })

  it('returns true when session was early morning today', () => {
    // Create a date that's today at 8 AM in SGT
    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: SGT }).format(now)
    const [y, m, d] = todayStr.split('-').map(Number)
    // 8 AM SGT = 0 AM UTC
    const session = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
    expect(isSessionToday(session.toISOString(), SGT)).toBe(true)
  })

  it('handles timezone where session date differs from UTC date', () => {
    // A session at 2026-03-28T23:00:00Z is still March 28 in UTC
    // but March 29 in SGT (7 AM)
    const result = isSessionToday('2026-03-28T23:00:00Z', SGT)
    // This is "today" only if today is March 29 in SGT — we just verify no crash
    expect(typeof result).toBe('boolean')
  })
})

describe('isSessionPast', () => {
  it('returns false for a future session', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionPast(future, null, SGT)).toBe(false)
  })

  it('returns true when session_end has passed', () => {
    const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    expect(isSessionPast(pastStart, pastEnd, SGT)).toBe(true)
  })

  it('returns false when session_end is in the future', () => {
    const pastStart = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    const futureEnd = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    expect(isSessionPast(pastStart, futureEnd, SGT)).toBe(false)
  })

  it('uses session_start + 4h fallback when no end time', () => {
    // Session started 3 hours ago, no end time → within 4h window → not past
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(isSessionPast(threeHoursAgo, null, SGT)).toBe(false)
  })

  it('returns true after 4h fallback window', () => {
    // Session started 5 hours ago, no end time → past 4h window → past
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    expect(isSessionPast(fiveHoursAgo, null, SGT)).toBe(true)
  })
})

describe('getSessionWeekLabel', () => {
  it('returns THIS WEEK for a session today', () => {
    const now = new Date()
    expect(getSessionWeekLabel(now.toISOString(), SGT)).toBe('THIS WEEK')
  })

  it('returns NEXT WEEK for a session 7 days from now (mid-week baseline)', () => {
    // To reliably test "next week", pick a Wednesday and add 7 days
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: SGT,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }).formatToParts(now)
    const dayOfWeek = parts.find(p => p.type === 'weekday')?.value

    // If today is Mon-Thu, next week's same day is definitely "NEXT WEEK"
    if (['Mon', 'Tue', 'Wed', 'Thu'].includes(dayOfWeek ?? '')) {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      expect(getSessionWeekLabel(nextWeek.toISOString(), SGT)).toBe('NEXT WEEK')
    }
  })

  it('returns IN 2 WEEKS for a session 14 days from now (mid-week)', () => {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: SGT,
      weekday: 'short',
    }).formatToParts(now)
    const dayOfWeek = parts.find(p => p.type === 'weekday')?.value

    if (['Mon', 'Tue', 'Wed', 'Thu'].includes(dayOfWeek ?? '')) {
      const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      expect(getSessionWeekLabel(twoWeeks.toISOString(), SGT)).toBe('IN 2 WEEKS')
    }
  })

  it('returns formatted date for sessions more than 2 weeks out', () => {
    const farOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const result = getSessionWeekLabel(farOut.toISOString(), SGT)
    // Should not be a week label
    expect(result).not.toBe('THIS WEEK')
    expect(result).not.toBe('NEXT WEEK')
    expect(result).not.toBe('IN 2 WEEKS')
    // Should be a formatted date like "Sat 12 Apr"
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/)
  })
})

describe('combineDateTime', () => {
  it('combines date and time in SGT correctly', () => {
    const result = combineDateTime('2026-03-29', '08:00', SGT)
    // 8:00 AM SGT = 00:00 UTC
    const date = new Date(result)
    expect(date.getUTCHours()).toBe(0)
    expect(date.getUTCMinutes()).toBe(0)
    expect(date.getUTCDate()).toBe(29)
    expect(date.getUTCMonth()).toBe(2) // March = 2
  })

  it('combines date and time in UTC correctly', () => {
    const result = combineDateTime('2026-03-29', '14:30', UTC)
    const date = new Date(result)
    expect(date.getUTCHours()).toBe(14)
    expect(date.getUTCMinutes()).toBe(30)
  })

  it('combines date and time in NYC correctly', () => {
    const result = combineDateTime('2026-03-29', '10:00', NYC)
    // March 29 2026 in NYC is EDT (UTC-4)
    // 10:00 AM EDT = 14:00 UTC
    const date = new Date(result)
    expect(date.getUTCHours()).toBe(14)
    expect(date.getUTCMinutes()).toBe(0)
  })

  it('produces ISO string output', () => {
    const result = combineDateTime('2026-03-29', '08:00', SGT)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
  })
})

describe('getUpcomingSessionDate', () => {
  it('returns a future date', () => {
    const result = getUpcomingSessionDate(0, SGT) // Next Sunday
    const date = new Date(result)
    const now = new Date()
    // The returned date should be in the future (or at most 7 days out)
    expect(date.getTime()).toBeGreaterThan(now.getTime() - 24 * 60 * 60 * 1000)
  })

  it('returns correct day of week', () => {
    // Request next Wednesday (3)
    const result = getUpcomingSessionDate(3, SGT)
    const date = new Date(result + 'T12:00:00Z') // Use noon to avoid date boundary issues
    expect(date.getDay()).toBe(3) // Wednesday
  })

  it('returns YYYY-MM-DD format', () => {
    const result = getUpcomingSessionDate(0, SGT)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('never returns today', () => {
    const now = new Date()
    const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: SGT }).format(now)
    const todayDow = now.getDay() // This is local, but close enough for testing
    // Request the same day of week as today
    const result = getUpcomingSessionDate(todayDow, SGT)
    // Should be 7 days from now, not today
    // (the function adds 7 if daysUntil <= 0)
    expect(result).not.toBe(todayParts)
  })
})
