/**
 * Club record analytics — pure functions for computing club-wide records.
 */

export interface ClubBestWeek {
  sessions: number
  km: number
  weekLabel: string // e.g. "3 Mar 2025"
}

/**
 * Find the club's best week ever by session count.
 * Groups sessions by ISO week (Mon–Sun) and returns the week with the most sessions.
 * Ties are broken by km, then by most recent.
 */
export function findClubBestWeek(
  sessions: { date: string; distance_km: number | null }[]
): ClubBestWeek | null {
  if (sessions.length === 0) return null

  // Group by Monday of each week
  const weeks = new Map<string, { sessions: number; km: number }>()

  for (const s of sessions) {
    if (!s.date) continue
    const monday = getMondayUTC(s.date)
    const entry = weeks.get(monday) ?? { sessions: 0, km: 0 }
    entry.sessions++
    entry.km += s.distance_km ?? 0
    weeks.set(monday, entry)
  }

  let best: { monday: string; sessions: number; km: number } | null = null

  for (const [monday, data] of weeks) {
    if (
      !best ||
      data.sessions > best.sessions ||
      (data.sessions === best.sessions && data.km > best.km) ||
      (data.sessions === best.sessions && data.km === best.km && monday > best.monday)
    ) {
      best = { monday, ...data }
    }
  }

  if (!best) return null

  // Format week label: "3 Mar 2025"
  const [y, m, d] = best.monday.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekLabel = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return {
    sessions: best.sessions,
    km: Math.round(best.km * 10) / 10,
    weekLabel,
  }
}

// Inline Monday calculation (same logic as streaks.ts, kept separate to avoid circular deps)
function getMondayUTC(dateStr: string): string {
  const dateOnly = dateStr.split('T')[0]
  const [y, m, d] = dateOnly.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay()
  const diff = dow === 0 ? 6 : dow - 1
  date.setUTCDate(date.getUTCDate() - diff)
  return date.toISOString().split('T')[0]
}
