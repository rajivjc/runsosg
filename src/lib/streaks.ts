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
