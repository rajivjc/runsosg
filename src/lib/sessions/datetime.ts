/**
 * Session datetime helpers.
 *
 * All training session times are stored as TIMESTAMPTZ.
 * These helpers convert to the club's timezone for display.
 * NEVER interpret session_start without the club timezone.
 */

/** Format: "Sat 29 Mar" (short date for cards) */
export function formatSessionDate(sessionStart: string, timezone: string): string {
  const date = new Date(sessionStart)
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: timezone }).format(date)
  const day = new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: timezone }).format(date)
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: timezone }).format(date)
  return `${weekday} ${day} ${month}`
}

/** Format: "Saturday, 29 March 2026" (full date for detail pages) */
export function formatSessionDateLong(sessionStart: string, timezone: string): string {
  const date = new Date(sessionStart)
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: timezone }).format(date)
  const day = new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: timezone }).format(date)
  const month = new Intl.DateTimeFormat('en', { month: 'long', timeZone: timezone }).format(date)
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: timezone }).format(date)
  return `${weekday}, ${day} ${month} ${year}`
}

/** Format: "8:00 AM" */
export function formatSessionTime(sessionStart: string, timezone: string): string {
  const date = new Date(sessionStart)
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date)
}

/** Format: "8:00 AM – 10:00 AM" or "8:00 AM" if no end */
export function formatSessionTimeRange(
  sessionStart: string,
  sessionEnd: string | null,
  timezone: string
): string {
  const startStr = formatSessionTime(sessionStart, timezone)
  if (!sessionEnd) return startStr
  const endStr = formatSessionTime(sessionEnd, timezone)
  return `${startStr} – ${endStr}`
}

/** True if session_start falls on today in the club's timezone */
export function isSessionToday(sessionStart: string, timezone: string): boolean {
  const now = new Date()
  const sessionDate = new Date(sessionStart)

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now)
  const sessionStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(sessionDate)

  return todayStr === sessionStr
}

/** True if session has ended. Uses session_end if available, otherwise session_start + 4 hours */
export function isSessionPast(
  sessionStart: string,
  sessionEnd: string | null,
  timezone: string
): boolean {
  void timezone // Comparison is UTC-based; timezone param kept for API consistency
  const now = new Date()
  if (sessionEnd) {
    return now > new Date(sessionEnd)
  }
  const fallbackEnd = new Date(new Date(sessionStart).getTime() + 4 * 60 * 60 * 1000)
  return now > fallbackEnd
}

/**
 * Returns a week label for grouping:
 * "THIS WEEK" | "NEXT WEEK" | "IN 2 WEEKS" | "Sat 12 Apr" (for further out)
 */
export function getSessionWeekLabel(sessionStart: string, timezone: string): string {
  const now = new Date()
  const session = new Date(sessionStart)

  // Get the start of the current week (Monday) in the club's timezone
  const nowParts = getDateParts(now, timezone)
  const sessionParts = getDateParts(session, timezone)

  // Calculate Monday of each week
  // JS getDay: 0=Sun, we want Mon=0 for week calc
  const nowDayOfWeek = (nowParts.dayOfWeek + 6) % 7 // Mon=0, Sun=6
  const sessionDayOfWeek = (sessionParts.dayOfWeek + 6) % 7

  // Days since Monday for each
  const nowMonday = new Date(nowParts.year, nowParts.month - 1, nowParts.day - nowDayOfWeek)
  const sessionMonday = new Date(sessionParts.year, sessionParts.month - 1, sessionParts.day - sessionDayOfWeek)

  const diffWeeks = Math.round((sessionMonday.getTime() - nowMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))

  if (diffWeeks === 0) return 'THIS WEEK'
  if (diffWeeks === 1) return 'NEXT WEEK'
  if (diffWeeks === 2) return 'IN 2 WEEKS'
  return formatSessionDate(sessionStart, timezone)
}

/**
 * Combines a date input (YYYY-MM-DD) and time input (HH:mm) into a TIMESTAMPTZ string
 * using the club's timezone. Used by the create/edit session form.
 */
export function combineDateTime(date: string, time: string, timezone: string): string {
  // Build a date string that represents the local time in the target timezone
  // Parse components
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  // Create a date in UTC, then adjust for the timezone offset
  // First, find the UTC offset for this specific date/time in the timezone
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute))

  // Use Intl to find the actual offset
  const offset = getTimezoneOffset(rough, timezone)

  // The local time we want is hour:minute in the timezone
  // So UTC time = local time - offset
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  const adjusted = new Date(utc.getTime() - offset)

  // Verify: the adjusted UTC time, when displayed in the timezone, should show the correct local time
  // Handle DST edge cases by checking and re-adjusting if needed
  const checkOffset = getTimezoneOffset(adjusted, timezone)
  if (checkOffset !== offset) {
    const readjusted = new Date(utc.getTime() - checkOffset)
    return readjusted.toISOString()
  }

  return adjusted.toISOString()
}

/**
 * Given a day of week (0=Sun, 6=Sat), returns the next occurrence as YYYY-MM-DD
 * in the club's timezone. Used by the auto-draft cron.
 */
export function getUpcomingSessionDate(dayOfWeek: number, timezone: string): string {
  const now = new Date()
  const nowParts = getDateParts(now, timezone)
  const currentDayOfWeek = nowParts.dayOfWeek // 0=Sun

  let daysUntil = dayOfWeek - currentDayOfWeek
  if (daysUntil <= 0) daysUntil += 7

  const target = new Date(nowParts.year, nowParts.month - 1, nowParts.day + daysUntil)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function getDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
  }
}

function getTimezoneOffset(date: Date, timezone: string): number {
  // Returns the offset in milliseconds: localTime - UTC
  // e.g. Asia/Singapore is UTC+8, so offset = +8*60*60*1000
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
  const utcDate = new Date(utcStr)
  const tzDate = new Date(tzStr)
  return tzDate.getTime() - utcDate.getTime()
}
