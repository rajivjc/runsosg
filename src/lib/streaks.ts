/**
 * Coaching streak calculation.
 *
 * Tracks consecutive weeks (Mon–Sun) where a coach logged at least one session.
 * Session dates may be YYYY-MM-DD strings or full ISO timestamps (timestamptz).
 */

function toDateOnly(dateStr: string): string {
  return dateStr.split('T')[0]
}

function getMondayUTC(dateStr: string): string {
  const [y, m, d] = toDateOnly(dateStr).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() // 0=Sun … 6=Sat
  const diff = dow === 0 ? 6 : dow - 1
  date.setUTCDate(date.getUTCDate() - diff)
  return date.toISOString().split('T')[0]
}

function subtractWeek(mondayStr: string): string {
  const [y, m, d] = toDateOnly(mondayStr).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d - 7))
  return date.toISOString().split('T')[0]
}

function getTodaySGT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

export function calculateWeeklyStreak(sessionDates: string[]): {
  current: number
  activeThisWeek: boolean
} {
  const validDates = sessionDates.filter(d => d != null && d !== '')
  if (validDates.length === 0) return { current: 0, activeThisWeek: false }

  const activeWeeks = new Set(validDates.map(getMondayUTC))
  const currentMonday = getMondayUTC(getTodaySGT())
  const activeThisWeek = activeWeeks.has(currentMonday)

  // Start from current week if active, otherwise from the previous week
  let week = activeThisWeek ? currentMonday : subtractWeek(currentMonday)
  let streak = 0

  while (activeWeeks.has(week)) {
    streak++
    week = subtractWeek(week)
  }

  return { current: streak, activeThisWeek }
}

// ─── Extended streak details with longest + weekly activity ─────

export interface StreakDetails {
  current: number
  longest: number
  activeThisWeek: boolean
  weeklyActivity: { weekStart: string; active: boolean }[]
}

/**
 * Extended streak calculation returning current streak, longest ever,
 * and a week-by-week activity map for visual calendars.
 *
 * @param sessionDates  Array of YYYY-MM-DD (or ISO timestamp) strings
 * @param weekCount     Number of recent weeks to include in weeklyActivity (default 12)
 */
export function calculateStreakDetails(sessionDates: string[], weekCount = 12): StreakDetails {
  const validDates = sessionDates.filter(d => d != null && d !== '')
  if (validDates.length === 0) {
    const currentMonday = getMondayUTC(getTodaySGT())
    const weeklyActivity: StreakDetails['weeklyActivity'] = []
    let week = currentMonday
    for (let i = 0; i < weekCount; i++) {
      weeklyActivity.unshift({ weekStart: week, active: false })
      week = subtractWeek(week)
    }
    return { current: 0, longest: 0, activeThisWeek: false, weeklyActivity }
  }

  const activeWeeks = new Set(validDates.map(getMondayUTC))
  const currentMonday = getMondayUTC(getTodaySGT())
  const activeThisWeek = activeWeeks.has(currentMonday)

  // Current streak (same logic as calculateWeeklyStreak)
  let week = activeThisWeek ? currentMonday : subtractWeek(currentMonday)
  let current = 0
  while (activeWeeks.has(week)) {
    current++
    week = subtractWeek(week)
  }

  // Longest streak: iterate all active weeks chronologically
  const sortedWeeks = [...activeWeeks].sort()
  let longest = 0
  let run = 1
  for (let i = 1; i < sortedWeeks.length; i++) {
    const expectedPrev = subtractWeek(sortedWeeks[i])
    if (expectedPrev === sortedWeeks[i - 1]) {
      run++
    } else {
      run = 1
    }
    if (run > longest) longest = run
  }
  // Handle single-week case
  if (sortedWeeks.length >= 1 && longest === 0) longest = 1
  if (current > longest) longest = current

  // Weekly activity map (most recent weekCount weeks)
  const weeklyActivity: StreakDetails['weeklyActivity'] = []
  let w = currentMonday
  for (let i = 0; i < weekCount; i++) {
    weeklyActivity.unshift({ weekStart: w, active: activeWeeks.has(w) })
    w = subtractWeek(w)
  }

  return { current, longest, activeThisWeek, weeklyActivity }
}
