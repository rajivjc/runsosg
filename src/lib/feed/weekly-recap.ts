/**
 * Weekly club recap calculation.
 *
 * Pure function — takes pre-fetched session and milestone data and returns
 * structured recap stats. No database calls, easy to test.
 */

export interface WeeklyRecap {
  totalSessions: number
  totalKm: number
  activeAthletes: number
  milestonesEarned: number
  starMoment: {
    athleteName: string
    type: 'feel' | 'distance'
    value: string
  } | null
}

export interface RecapSession {
  athlete_id: string
  athlete_name: string
  distance_km: number | null
  feel: number | null
}

export interface RecapMilestone {
  achievedAt: string
}

/**
 * Compute the weekly club recap from sessions and milestones.
 *
 * @param sessions  Sessions that occurred during the recap week
 * @param milestones  All recent milestones (will be filtered to the week)
 * @param weekStart  Start of the recap week (inclusive, Monday 00:00)
 */
export function computeWeeklyRecap(
  sessions: RecapSession[],
  milestones: RecapMilestone[],
  weekStart: Date
): WeeklyRecap {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const totalSessions = sessions.length
  const totalKm = sessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const activeAthletes = new Set(sessions.map(s => s.athlete_id)).size

  // Count milestones earned during this week
  const milestonesEarned = milestones.filter(m => {
    const d = new Date(m.achievedAt)
    return d >= weekStart && d < weekEnd
  }).length

  // Star moment: best feel (5) takes priority, then longest distance
  let starMoment: WeeklyRecap['starMoment'] = null

  const bestFeelSession = sessions.find(s => s.feel === 5)
  if (bestFeelSession) {
    starMoment = {
      athleteName: bestFeelSession.athlete_name,
      type: 'feel',
      value: 'had an amazing run 🔥',
    }
  } else {
    const longestRun = sessions
      .filter(s => s.distance_km != null && s.distance_km > 0)
      .sort((a, b) => (b.distance_km ?? 0) - (a.distance_km ?? 0))[0]

    if (longestRun && longestRun.distance_km) {
      starMoment = {
        athleteName: longestRun.athlete_name,
        type: 'distance',
        value: `ran ${longestRun.distance_km.toFixed(1)}km`,
      }
    }
  }

  return { totalSessions, totalKm, activeAthletes, milestonesEarned, starMoment }
}
