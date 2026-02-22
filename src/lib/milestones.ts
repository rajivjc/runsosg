import { adminClient } from '@/lib/supabase/admin'

export async function checkAndAwardMilestones(
  athleteId: string,
  sessionId: string,
  coachUserId?: string
): Promise<number> {
  try {
    // 1. Fetch all active automatic milestone definitions
    const { data: definitions } = await adminClient
      .from('milestone_definitions')
      .select('id, label, icon, condition')
      .eq('active', true)
      .eq('type', 'automatic')

    if (!definitions || definitions.length === 0) return 0

    // 2. Fetch existing milestones for this athlete to avoid duplicates
    const { data: existing } = await adminClient
      .from('milestones')
      .select('milestone_definition_id')
      .eq('athlete_id', athleteId)

    const existingDefinitionIds = new Set(
      (existing ?? [])
        .map((m: any) => m.milestone_definition_id)
        .filter(Boolean)
    )

    // 3. Fetch all completed sessions for this athlete ordered by date
    const { data: sessions } = await adminClient
      .from('sessions')
      .select('id, date, distance_km')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .order('date', { ascending: true })

    const allSessions = sessions ?? []
    const sessionCount = allSessions.length

    // Find the current session
    const currentSession = allSessions.find((s: any) => s.id === sessionId)
    const currentDistanceKm: number | null = currentSession?.distance_km ?? null

    // Check if this session is the athlete's longest run ever
    const maxDistance = allSessions.reduce((max: number, s: any) => {
      return (s.distance_km ?? 0) > max ? (s.distance_km as number) : max
    }, 0)
    const isLongestRun =
      currentDistanceKm != null &&
      currentDistanceKm > 0 &&
      currentDistanceKm >= maxDistance

    // 4. Evaluate each definition condition
    const toAward: typeof definitions = []

    for (const def of definitions) {
      if (existingDefinitionIds.has(def.id)) continue

      const condition = def.condition as { metric?: string; threshold?: number } | null
      if (!condition) continue

      if (
        condition.metric === 'session_count' &&
        condition.threshold != null &&
        sessionCount === condition.threshold
      ) {
        toAward.push(def)
      } else if (
        condition.metric === 'distance_km' &&
        condition.threshold != null &&
        currentDistanceKm != null &&
        currentDistanceKm >= condition.threshold
      ) {
        toAward.push(def)
      } else if (condition.metric === 'longest_run' && isLongestRun) {
        toAward.push(def)
      }
    }

    if (toAward.length === 0) return 0

    // 5. Insert earned milestones
    const achievedAt = new Date().toISOString()
    const inserts = toAward.map((def: any) => ({
      athlete_id: athleteId,
      milestone_definition_id: def.id,
      label: def.label,
      achieved_at: achievedAt,
      session_id: sessionId,
      awarded_by: coachUserId ?? null,
      share_image_url: null,
    }))

    const { error } = await adminClient.from('milestones').insert(inserts)
    if (error) {
      console.error('Failed to insert milestones:', error)
      return 0
    }

    return toAward.length
  } catch (err) {
    console.error('checkAndAwardMilestones error:', err)
    return 0
  }
}
