const SGT = 'Asia/Singapore'

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SGT,
  }).format(d)
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SGT,
  }).format(d)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`
  return `${metres}m`
}

/**
 * Extract a YYYY-MM-DD string from a date value that may be either
 * a plain date string or a full ISO timestamp (from timestamptz columns).
 * Uses Asia/Singapore timezone for consistent date extraction.
 */
export function toDateOnly(value: string | null | undefined): string {
  if (!value) return ''
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()
  // Full ISO timestamp — extract date in SGT
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  // Format as YYYY-MM-DD in Singapore timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SGT,
  }).format(d)
  return parts
}

/**
 * Validate that a string is a valid YYYY-MM-DD date.
 * Returns the validated date string or null if invalid.
 */
/**
 * Format pace as m:ss/km from distance (km) and duration (seconds).
 * Returns null if either value is missing or zero.
 */
export function formatPace(distanceKm: number | null | undefined, durationSeconds: number | null | undefined): string | null {
  if (!distanceKm || !durationSeconds || distanceKm <= 0 || durationSeconds <= 0) return null
  const paceSeconds = durationSeconds / distanceKm
  const mins = Math.floor(paceSeconds / 60)
  const secs = Math.round(paceSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/km`
}

export function parseValidDate(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const d = new Date(trimmed + 'T12:00:00+08:00')
  if (isNaN(d.getTime())) return null
  return trimmed
}

// ─── Timezone-aware helpers (Phase B) ───────────────────────────

/**
 * Get the current date/time components in a specific timezone.
 * Returns a Date object whose local methods (getHours, getDay, etc.)
 * reflect the wall-clock time in the given timezone.
 *
 * WARNING: The returned Date's internal UTC epoch is shifted — do NOT
 * pass it to APIs that expect real UTC timestamps. Use this only for
 * extracting wall-clock components (hour, day-of-week, date parts).
 *
 * @param timezone  IANA timezone string, e.g. 'Asia/Singapore'
 */
export function nowInTimezone(timezone: string): Date {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
  } catch {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  }
}

/**
 * Get today's date as YYYY-MM-DD in a specific timezone.
 *
 * @param timezone  IANA timezone string, e.g. 'Asia/Singapore'
 */
export function todayInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
  }
}

/**
 * Convert a YYYY-MM-DD string to a Date anchored at noon in the given timezone.
 * This replaces the hardcoded `new Date(dateStr + 'T12:00:00+08:00')` pattern.
 *
 * Uses noon to avoid day-boundary issues when the timezone has DST or
 * unusual offsets. The returned Date is suitable for display formatting
 * and week-of-year calculations.
 *
 * @param dateStr   Date string in YYYY-MM-DD format
 * @param timezone  IANA timezone string, e.g. 'Asia/Singapore'
 */
export function dateOnlyToDate(dateStr: string, timezone: string): Date {
  // Extract the YYYY-MM-DD part in case a full ISO string was passed
  const ymd = dateStr.split('T')[0]
  try {
    // Get the UTC offset for this timezone at noon on the given date.
    // We approximate by constructing a UTC noon date, then measuring
    // the difference between UTC and the timezone's wall-clock.
    const [y, m, d] = ymd.split('-').map(Number)
    const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))

    const utcStr = utcNoon.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = utcNoon.toLocaleString('en-US', { timeZone: timezone })
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()

    // Shift so that local methods return wall-clock time in the target timezone
    return new Date(utcNoon.getTime() + offsetMs)
  } catch {
    // Fallback: use +08:00 (Singapore) if timezone is invalid
    return new Date(ymd + 'T12:00:00+08:00')
  }
}

/**
 * Get the UTC offset string (e.g. '+08:00', '-05:00') for a timezone
 * at a given moment. Used for constructing ISO strings for database queries.
 *
 * @param timezone  IANA timezone string
 * @param date      The moment to check (default: now). Important because
 *                  some timezones observe DST.
 */
export function getUtcOffset(timezone: string, date: Date = new Date()): string {
  try {
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
    const diffMinutes = (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000

    const sign = diffMinutes >= 0 ? '+' : '-'
    const abs = Math.abs(diffMinutes)
    const hours = String(Math.floor(abs / 60)).padStart(2, '0')
    const minutes = String(abs % 60).padStart(2, '0')
    return `${sign}${hours}:${minutes}`
  } catch {
    return '+08:00' // Fallback to Singapore
  }
}

/**
 * Format a date string for display using the club's locale and timezone.
 * A convenience wrapper around Intl.DateTimeFormat.
 *
 * @param dateStr   ISO date string or YYYY-MM-DD
 * @param locale    BCP 47 locale, e.g. 'en-SG'
 * @param timezone  IANA timezone string, e.g. 'Asia/Singapore'
 * @param options   Intl.DateTimeFormat options (without timeZone — it's added automatically)
 */
export function formatDateInTimezone(
  dateStr: string,
  locale: string,
  timezone: string,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleDateString(locale, { ...options, timeZone: timezone })
  } catch {
    return d.toLocaleDateString('en-SG', { ...options, timeZone: 'Asia/Singapore' })
  }
}
