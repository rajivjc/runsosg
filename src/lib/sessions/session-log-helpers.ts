/**
 * Helpers for pre-populating the GroupLogRunSheet with data from a training session.
 */

import { adminClient } from '@/lib/supabase/admin'

export type SessionLogPrePopData = {
  trainingSessionId: string
  sessionDate: string // YYYY-MM-DD in club timezone
  assignedAthletes: { id: string; name: string; avatar: string | null }[]
  allAthletes: { id: string; name: string; avatar: string | null }[]
}

/**
 * Get pre-population data for logging runs from a training session context.
 * Fetches the coach's assigned athletes for the session and all active athletes.
 */
export async function getSessionLogPrePopData(
  trainingSessionId: string,
  coachUserId: string,
  timezone: string
): Promise<SessionLogPrePopData | null> {
  const [sessionResult, assignmentsResult, allAthletesResult] = await Promise.all([
    adminClient
      .from('training_sessions')
      .select('id, session_start')
      .eq('id', trainingSessionId)
      .single(),
    adminClient
      .from('session_assignments')
      .select('athlete_id, athletes!session_assignments_athlete_id_fkey(id, name, avatar)')
      .eq('session_id', trainingSessionId)
      .eq('coach_id', coachUserId),
    adminClient
      .from('athletes')
      .select('id, name, avatar')
      .eq('active', true)
      .order('name'),
  ])

  if (!sessionResult.data) return null

  // Convert session_start to YYYY-MM-DD in club timezone
  const sessionDate = new Date(sessionResult.data.session_start)
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(sessionDate)

  const assignedAthletes = (assignmentsResult.data ?? []).map(a => {
    const ath = (a as unknown as { athletes?: { id: string; name: string; avatar: string | null } }).athletes
    return {
      id: ath?.id ?? a.athlete_id,
      name: ath?.name ?? 'Athlete',
      avatar: ath?.avatar ?? null,
    }
  })

  const allAthletes = (allAthletesResult.data ?? []).map(a => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
  }))

  return {
    trainingSessionId,
    sessionDate: dateStr,
    assignedAthletes,
    allAthletes,
  }
}

/**
 * Get logged runs for a training session, grouped by athlete.
 * Used to show post-log state on the session detail and feed cards.
 */
export async function getLoggedRunsForSession(
  trainingSessionId: string
): Promise<{ athlete_id: string; distance_km: number | null; note: string | null }[]> {
  const { data } = await adminClient
    .from('sessions')
    .select('athlete_id, distance_km, note')
    .eq('training_session_id', trainingSessionId)
    .eq('status', 'completed')

  return data ?? []
}
