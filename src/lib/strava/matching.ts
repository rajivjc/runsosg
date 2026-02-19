import { adminClient } from '@/lib/supabase/admin'
import type { StravaActivity } from './client'

export interface MatchResult {
  matched: boolean
  athleteId: string | null
  method: 'hashtag' | 'schedule' | null
  confidence: 'high' | 'medium' | null
}

// Extract the word immediately following #sosg or SOSG (case-insensitive)
function extractHashtagIdentifier(text: string): string | null {
  const match = text.match(/(?:#sosg|sosg)\s+(\S+)/i)
  return match ? match[1].replace(/[^a-zA-Z0-9]/g, '') : null
}

export async function matchActivityToAthlete(
  activity: StravaActivity,
  coachUserId: string
): Promise<MatchResult> {
  // ── Level 1: Hashtag matching ──────────────────────────────────────────────
  const combined = [activity.name, activity.description ?? ''].join(' ')
  const identifier = extractHashtagIdentifier(combined)

  if (identifier) {
    const { data: athletes } = await adminClient
      .from('athletes')
      .select('id, name')
      .eq('active', true)
      .ilike('name', `%${identifier}%`)

    if (athletes && athletes.length === 1) {
      return {
        matched: true,
        athleteId: athletes[0].id,
        method: 'hashtag',
        confidence: 'high',
      }
    }
  }

  // ── Level 2: Schedule matching ─────────────────────────────────────────────
  const activityDate = new Date(activity.start_date)
  const windowStart = new Date(activityDate.getTime() - 2 * 60 * 60 * 1000)
  const windowEnd = new Date(activityDate.getTime() + 2 * 60 * 60 * 1000)

  const { data: sessions } = await adminClient
    .from('sessions')
    .select('id, athlete_id')
    .eq('coach_user_id', coachUserId)
    .eq('status', 'planned')
    .gte('date', windowStart.toISOString())
    .lte('date', windowEnd.toISOString())

  if (sessions && sessions.length === 1) {
    return {
      matched: true,
      athleteId: sessions[0].athlete_id,
      method: 'schedule',
      confidence: 'medium',
    }
  }

  return {
    matched: false,
    athleteId: null,
    method: null,
    confidence: null,
  }
}
