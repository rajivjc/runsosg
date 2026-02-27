/**
 * Session trend analytics — pure functions for chart-ready data.
 *
 * No database calls. All functions accept pre-fetched session arrays
 * and return structured data ready for chart components.
 */

const SGT = 'Asia/Singapore'

/**
 * Extract the YYYY-MM-DD portion from a date string that may be
 * a full ISO timestamp (e.g. "2024-02-15T08:30:00.000Z") or
 * already a plain date ("2024-02-15").
 */
function toDateOnly(dateStr: string): string {
  return dateStr.split('T')[0]
}

export interface SessionForTrends {
  date: string
  distance_km: number | null
  duration_seconds: number | null
  feel: number | null
}

export interface MilestonePin {
  date: string
  label: string
  icon: string
}

// --- Weekly Volume ---

export interface WeeklyVolume {
  weekLabel: string    // e.g. "3 Feb"
  weekStart: string    // ISO date of Monday
  totalKm: number
  sessionCount: number
}

/**
 * Get the Monday (ISO week start) of a given date string.
 */
function getMonday(dateStr: string): Date {
  const d = new Date(toDateOnly(dateStr) + 'T12:00:00+08:00') // SGT noon to avoid DST issues
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    timeZone: SGT,
  })
}

function toISODate(d: Date): string {
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export function computeWeeklyVolume(
  sessions: SessionForTrends[],
  weekCount = 12
): WeeklyVolume[] {
  const valid = sessions.filter(s => s.date && !isNaN(new Date(s.date).getTime()))
  const now = new Date()
  const currentMonday = getMonday(toISODate(now))

  // Build empty week buckets
  const weeks: WeeklyVolume[] = []
  for (let i = weekCount - 1; i >= 0; i--) {
    const monday = new Date(currentMonday)
    monday.setDate(monday.getDate() - i * 7)
    weeks.push({
      weekLabel: formatWeekLabel(monday),
      weekStart: toISODate(monday),
      totalKm: 0,
      sessionCount: 0,
    })
  }

  const cutoff = weeks[0].weekStart

  for (const s of valid) {
    if (s.date < cutoff) continue
    const monday = getMonday(s.date)
    const weekKey = toISODate(monday)
    const week = weeks.find(w => w.weekStart === weekKey)
    if (week) {
      week.totalKm += s.distance_km ?? 0
      week.sessionCount += 1
    }
  }

  // Round to 1 decimal
  for (const w of weeks) {
    w.totalKm = Math.round(w.totalKm * 10) / 10
  }

  return weeks
}

// --- Feel Trend ---

export interface FeelPoint {
  date: string
  dateLabel: string   // e.g. "3 Feb"
  feel: number
}

export function computeFeelTrend(sessions: SessionForTrends[]): FeelPoint[] {
  return sessions
    .filter(s => s.date && !isNaN(new Date(s.date).getTime()) && s.feel != null)
    .map(s => ({
      date: s.date,
      dateLabel: new Date(toDateOnly(s.date) + 'T12:00:00+08:00').toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        timeZone: SGT,
      }),
      feel: s.feel!,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// --- Distance Timeline (with milestone pins) ---

export interface DistancePoint {
  date: string
  dateLabel: string
  distanceKm: number
  cumulativeKm: number
}

export function computeDistanceTimeline(
  sessions: SessionForTrends[]
): DistancePoint[] {
  const sorted = [...sessions]
    .filter(s => s.date && !isNaN(new Date(s.date).getTime()) && s.distance_km != null && s.distance_km > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  let cumulative = 0
  return sorted.map(s => {
    cumulative += s.distance_km ?? 0
    return {
      date: s.date,
      dateLabel: new Date(toDateOnly(s.date) + 'T12:00:00+08:00').toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        timeZone: SGT,
      }),
      distanceKm: Math.round((s.distance_km ?? 0) * 10) / 10,
      cumulativeKm: Math.round(cumulative * 10) / 10,
    }
  })
}

// --- Personal Bests ---

export interface PersonalBest {
  metric: 'distance' | 'duration' | 'pace'
  value: number
  formattedValue: string
  date: string
  previousBest: number | null
}

export function computePersonalBests(
  sessions: SessionForTrends[]
): PersonalBest[] {
  const bests: PersonalBest[] = []
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  // Longest distance
  let bestDistance = 0
  let bestDistanceDate = ''
  let prevBestDistance: number | null = null

  for (const s of sorted) {
    if (s.distance_km != null && s.distance_km > bestDistance) {
      prevBestDistance = bestDistance > 0 ? bestDistance : null
      bestDistance = s.distance_km
      bestDistanceDate = s.date
    }
  }

  if (bestDistance > 0) {
    bests.push({
      metric: 'distance',
      value: bestDistance,
      formattedValue: `${bestDistance.toFixed(2)} km`,
      date: bestDistanceDate,
      previousBest: prevBestDistance,
    })
  }

  // Longest duration
  let bestDuration = 0
  let bestDurationDate = ''
  let prevBestDuration: number | null = null

  for (const s of sorted) {
    if (s.duration_seconds != null && s.duration_seconds > bestDuration) {
      prevBestDuration = bestDuration > 0 ? bestDuration : null
      bestDuration = s.duration_seconds
      bestDurationDate = s.date
    }
  }

  if (bestDuration > 0) {
    const mins = Math.floor(bestDuration / 60)
    bests.push({
      metric: 'duration',
      value: bestDuration,
      formattedValue: `${mins}m`,
      date: bestDurationDate,
      previousBest: prevBestDuration,
    })
  }

  return bests
}
