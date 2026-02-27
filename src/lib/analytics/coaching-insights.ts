/**
 * Coaching insight detection — pure functions.
 *
 * Detects patterns in session data that coaches should act on:
 * feel declines, personal bests, best-ever weeks, and progress comparisons.
 *
 * No database calls. All functions accept pre-fetched data.
 */

export interface SessionForInsights {
  date: string
  distance_km: number | null
  feel: number | null
  athlete_id: string
}

// --- Feel Decline Detection ---

export interface FeelDecline {
  athleteId: string
  avgRecent: number
  avgPrior: number
  delta: number // negative means decline
}

/**
 * Detect a meaningful decline in feel scores for an athlete.
 * Compares the average feel of the last `windowDays` against the prior window.
 * Returns null if insufficient data or no significant decline (>= 1.0 drop).
 */
export function detectFeelDecline(
  sessions: SessionForInsights[],
  windowDays = 14
): FeelDecline | null {
  if (sessions.length === 0) return null

  const athleteId = sessions[0].athlete_id
  const now = new Date()
  const recentCutoff = new Date(now)
  recentCutoff.setDate(recentCutoff.getDate() - windowDays)
  const priorCutoff = new Date(recentCutoff)
  priorCutoff.setDate(priorCutoff.getDate() - windowDays)

  const recentCutoffStr = recentCutoff.toISOString().split('T')[0]
  const priorCutoffStr = priorCutoff.toISOString().split('T')[0]

  const recent = sessions.filter(s => s.date >= recentCutoffStr && s.feel != null)
  const prior = sessions.filter(s => s.date >= priorCutoffStr && s.date < recentCutoffStr && s.feel != null)

  // Need at least 2 sessions in each window for a meaningful comparison
  if (recent.length < 2 || prior.length < 2) return null

  const avgRecent = recent.reduce((sum, s) => sum + s.feel!, 0) / recent.length
  const avgPrior = prior.reduce((sum, s) => sum + s.feel!, 0) / prior.length
  const delta = avgRecent - avgPrior

  // Only flag meaningful declines (>= 1.0 point drop)
  if (delta >= -0.99) return null

  return {
    athleteId,
    avgRecent: Math.round(avgRecent * 10) / 10,
    avgPrior: Math.round(avgPrior * 10) / 10,
    delta: Math.round(delta * 10) / 10,
  }
}

// --- Personal Best Detection ---

export interface PersonalBestInsight {
  athleteId: string
  distanceKm: number
  previousBestKm: number | null
  date: string
}

/**
 * Check if the most recent session is a distance personal best.
 * Returns null if no sessions or the most recent isn't a PB.
 */
export function detectRecentPersonalBest(
  sessions: SessionForInsights[]
): PersonalBestInsight | null {
  if (sessions.length < 2) return null

  const withDistance = sessions.filter(s => s.distance_km != null && s.distance_km > 0)
  if (withDistance.length < 2) return null

  const sorted = [...withDistance].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]
  const rest = sorted.slice(1)

  const previousBest = Math.max(...rest.map(s => s.distance_km!))

  if (latest.distance_km! > previousBest) {
    return {
      athleteId: latest.athlete_id,
      distanceKm: Math.round(latest.distance_km! * 10) / 10,
      previousBestKm: Math.round(previousBest * 10) / 10,
      date: latest.date,
    }
  }

  return null
}

// --- Best Week Ever Detection ---

export interface BestWeekInsight {
  athleteId: string
  thisWeekKm: number
  previousBestWeekKm: number
}

/**
 * Check if the current week is the athlete's best-ever week by total distance.
 * Returns null if insufficient data or current week isn't a record.
 */
export function detectBestWeekEver(
  sessions: SessionForInsights[]
): BestWeekInsight | null {
  if (sessions.length === 0) return null

  const athleteId = sessions[0].athlete_id

  // Group by ISO week
  const weekTotals = new Map<string, number>()
  for (const s of sessions) {
    const weekKey = getISOWeekKey(s.date)
    weekTotals.set(weekKey, (weekTotals.get(weekKey) ?? 0) + (s.distance_km ?? 0))
  }

  if (weekTotals.size < 2) return null

  const currentWeekKey = getISOWeekKey(new Date().toISOString().split('T')[0])
  const currentWeekKm = weekTotals.get(currentWeekKey) ?? 0

  if (currentWeekKm <= 0) return null

  // Find previous best (excluding current week)
  let previousBest = 0
  for (const [key, km] of weekTotals) {
    if (key !== currentWeekKey && km > previousBest) {
      previousBest = km
    }
  }

  if (previousBest <= 0 || currentWeekKm <= previousBest) return null

  return {
    athleteId,
    thisWeekKm: Math.round(currentWeekKm * 10) / 10,
    previousBestWeekKm: Math.round(previousBest * 10) / 10,
  }
}

// --- Progress Comparison ---

export interface ProgressComparison {
  athleteId: string
  recentAvgKm: number
  earlyAvgKm: number
  improvementPct: number
  monthsOfData: number
}

/**
 * Compare the athlete's recent performance against their early sessions.
 * Compares average distance of last 30 days vs first 30 days.
 * Returns null if insufficient data or no meaningful improvement.
 */
export function computeProgressComparison(
  sessions: SessionForInsights[]
): ProgressComparison | null {
  const withDistance = sessions.filter(s => s.distance_km != null && s.distance_km > 0)
  if (withDistance.length < 4) return null

  const sorted = [...withDistance].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)

  const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  if (spanDays < 30) return null // Need at least 30 days of data

  const monthsOfData = Math.round(spanDays / 30)

  // First 30 days
  const earlyCutoff = new Date(firstDate)
  earlyCutoff.setDate(earlyCutoff.getDate() + 30)
  const earlyCutoffStr = earlyCutoff.toISOString().split('T')[0]

  // Last 30 days
  const recentCutoff = new Date(lastDate)
  recentCutoff.setDate(recentCutoff.getDate() - 30)
  const recentCutoffStr = recentCutoff.toISOString().split('T')[0]

  const early = sorted.filter(s => s.date < earlyCutoffStr)
  const recent = sorted.filter(s => s.date > recentCutoffStr)

  if (early.length < 2 || recent.length < 2) return null

  const earlyAvg = early.reduce((sum, s) => sum + s.distance_km!, 0) / early.length
  const recentAvg = recent.reduce((sum, s) => sum + s.distance_km!, 0) / recent.length

  if (earlyAvg <= 0) return null

  const improvementPct = Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100)

  // Only report if there's at least 20% improvement
  if (improvementPct < 20) return null

  const athleteId = sessions[0].athlete_id

  return {
    athleteId,
    recentAvgKm: Math.round(recentAvg * 10) / 10,
    earlyAvgKm: Math.round(earlyAvg * 10) / 10,
    improvementPct,
    monthsOfData,
  }
}

// --- Helper ---

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00+08:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff)
  return monday.toISOString().split('T')[0]
}
