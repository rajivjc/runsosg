/**
 * Goal progress calculation.
 *
 * Computes progress toward structured running goals based on session data.
 * Pure function — no database calls, easy to test.
 */

export type GoalType = 'distance_total' | 'distance_single' | 'session_count'

export interface GoalProgress {
  label: string
  current: number
  target: number
  pct: number
  unit: string
}

export interface SessionForGoal {
  distance_km: number | null
}

/**
 * Calculate progress toward a structured running goal.
 *
 * @param goalType  The type of goal
 * @param goalTarget  The numeric target value
 * @param sessions  Completed sessions for the athlete
 */
export function calculateGoalProgress(
  goalType: GoalType,
  goalTarget: number,
  sessions: SessionForGoal[]
): GoalProgress {
  let current: number
  let label: string
  let unit: string

  switch (goalType) {
    case 'distance_total': {
      current = sessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
      current = Math.round(current * 10) / 10
      label = `Run ${goalTarget}km total`
      unit = 'km'
      break
    }
    case 'distance_single': {
      const best = Math.max(0, ...sessions.map(s => s.distance_km ?? 0))
      current = Math.round(best * 10) / 10
      label = `Run ${goalTarget}km in one session`
      unit = 'km'
      break
    }
    case 'session_count': {
      current = sessions.length
      label = `Complete ${goalTarget} sessions`
      unit = 'runs'
      break
    }
  }

  const pct = goalTarget > 0 ? Math.min(100, Math.round((current / goalTarget) * 100)) : 0

  return { label, current, target: goalTarget, pct, unit }
}
