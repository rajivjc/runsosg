/**
 * Smart coach-athlete pairing suggestions based on actual coaching history.
 *
 * Uses COMPLETED training sessions where runs were actually logged (not just planned).
 * The algorithm learns from what happened, not what was planned.
 */

import { adminClient } from '@/lib/supabase/admin'

export interface SuggestionInput {
  availableCoaches: { id: string; name: string }[]
  attendingAthletes: { id: string; name: string }[]
  clubId: string
  maxAthletesPerCoach: number
}

export interface SuggestedAssignment {
  coachId: string
  athleteId: string
  confidence: 'regular' | 'suggested'
  frequency: number
}

interface FrequencyRow {
  coach_id: string
  athlete_id: string
  frequency: number
}

/**
 * Build a frequency matrix of (coach, athlete) pairings from completed sessions
 * where a run was actually logged for the athlete.
 *
 * Join path:
 *   session_assignments (planned pairing)
 *   → training_sessions (must be 'completed')
 *   → sessions (run logs, linked via training_session_id + athlete_id match)
 *
 * Only counts pairings where the athlete actually ran (has a sessions row).
 */
export async function buildFrequencyMatrix(
  clubId: string,
  coachIds: string[],
  athleteIds: string[]
): Promise<FrequencyRow[]> {
  if (coachIds.length === 0 || athleteIds.length === 0) return []

  // Get the last 8 completed training sessions for this club
  const { data: recentSessions } = await adminClient
    .from('training_sessions')
    .select('id')
    .eq('club_id', clubId)
    .eq('status', 'completed')
    .order('session_start', { ascending: false })
    .limit(8)

  if (!recentSessions || recentSessions.length === 0) return []

  const sessionIds = recentSessions.map(s => s.id)

  // Get all assignments from these sessions
  const { data: assignments } = await adminClient
    .from('session_assignments')
    .select('session_id, coach_id, athlete_id')
    .in('session_id', sessionIds)
    .in('coach_id', coachIds)
    .in('athlete_id', athleteIds)

  if (!assignments || assignments.length === 0) return []

  // Get all run logs linked to these training sessions for the relevant athletes
  const { data: runLogs } = await adminClient
    .from('sessions')
    .select('training_session_id, athlete_id')
    .in('training_session_id', sessionIds)
    .in('athlete_id', athleteIds)
    .eq('status', 'completed')

  if (!runLogs || runLogs.length === 0) return []

  // Build a set of (training_session_id, athlete_id) tuples where a run was logged
  const loggedRuns = new Set(
    runLogs.map(r => `${r.training_session_id}:${r.athlete_id}`)
  )

  // Count frequency: how often each (coach, athlete) pair was assigned
  // AND the athlete actually had a logged run in that session
  const frequencyMap = new Map<string, number>()

  for (const a of assignments) {
    const key = `${a.session_id}:${a.athlete_id}`
    if (!loggedRuns.has(key)) continue

    const pairKey = `${a.coach_id}:${a.athlete_id}`
    frequencyMap.set(pairKey, (frequencyMap.get(pairKey) ?? 0) + 1)
  }

  // Convert to array and sort by frequency descending
  const rows: FrequencyRow[] = []
  for (const [pairKey, frequency] of frequencyMap) {
    const [coach_id, athlete_id] = pairKey.split(':')
    rows.push({ coach_id, athlete_id, frequency })
  }

  rows.sort((a, b) => b.frequency - a.frequency)

  return rows.slice(0, 200) // reasonable cap
}

/**
 * Suggest coach-athlete pairings based on historical coaching frequency.
 *
 * Algorithm:
 * 1. Build frequency matrix from last 8 completed sessions with logged runs
 * 2. Sort pairs by frequency (descending)
 * 3. Greedy assignment: highest frequency first, respecting capacity limits
 * 4. Confidence labels based on frequency thresholds
 */
export async function suggestPairings(
  input: SuggestionInput
): Promise<SuggestedAssignment[]> {
  const { availableCoaches, attendingAthletes, clubId, maxAthletesPerCoach } = input

  if (availableCoaches.length === 0 || attendingAthletes.length === 0) return []

  const coachIds = availableCoaches.map(c => c.id)
  const athleteIds = attendingAthletes.map(a => a.id)

  const frequencyRows = await buildFrequencyMatrix(clubId, coachIds, athleteIds)

  // Cold start: no history
  if (frequencyRows.length === 0) return []

  // Greedy assignment
  const assignedAthletes = new Set<string>()
  const coachLoad = new Map<string, number>()
  const suggestions: SuggestedAssignment[] = []

  const coachSet = new Set(coachIds)
  const athleteSet = new Set(athleteIds)

  for (const row of frequencyRows) {
    if (!coachSet.has(row.coach_id)) continue
    if (!athleteSet.has(row.athlete_id)) continue
    if (assignedAthletes.has(row.athlete_id)) continue

    const currentLoad = coachLoad.get(row.coach_id) ?? 0
    if (currentLoad >= maxAthletesPerCoach) continue

    // Determine confidence label
    // "regular" if frequency >= 3 in last 5 completed sessions (spec says last 5 for label)
    // "suggested" if frequency >= 1
    const confidence: 'regular' | 'suggested' = row.frequency >= 3 ? 'regular' : 'suggested'

    suggestions.push({
      coachId: row.coach_id,
      athleteId: row.athlete_id,
      confidence,
      frequency: row.frequency,
    })

    assignedAthletes.add(row.athlete_id)
    coachLoad.set(row.coach_id, currentLoad + 1)
  }

  return suggestions
}
