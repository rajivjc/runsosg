'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { FeedSession } from '@/lib/feed/types'

/**
 * Load more sessions for infinite scrolling on the feed page.
 * Uses cursor-based pagination (cursor = date of last visible session).
 */
export async function loadMoreSessions(
  cursor: string,
  limit = 20
): Promise<{ sessions: FeedSession[]; hasMore: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { sessions: [], hasMore: false }

  const { data: rawSessions } = await adminClient
    .from('sessions')
    .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title')
    .eq('status', 'completed')
    .lt('date', cursor)
    .order('date', { ascending: false })
    .limit(limit + 1)

  const sessions = rawSessions ?? []
  const hasMore = sessions.length > limit
  const page = hasMore ? sessions.slice(0, limit) : sessions

  if (page.length === 0) return { sessions: [], hasMore: false }

  // Fetch athlete + coach names
  const athleteIds = [...new Set(page.map(s => s.athlete_id).filter(Boolean))]
  const coachIds = [...new Set(page.map(s => s.coach_user_id).filter((id): id is string => id != null))]

  const [{ data: athletes }, { data: coaches }, { data: kudosRows }, { data: myKudosRows }] = await Promise.all([
    athleteIds.length > 0
      ? adminClient.from('athletes').select('id, name').in('id', athleteIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    coachIds.length > 0
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; email: string | null }[] }),
    adminClient.from('kudos').select('session_id').in('session_id', page.map(s => s.id)),
    adminClient.from('kudos').select('session_id').in('session_id', page.map(s => s.id)).eq('user_id', user.id),
  ])

  const athleteMap = Object.fromEntries((athletes ?? []).map(a => [a.id, a.name]))
  const coachMap = Object.fromEntries(
    (coaches ?? []).map((u: { id: string; name: string | null; email: string | null }) => [u.id, u.name ?? u.email?.split('@')[0] ?? null])
  )

  const enriched: FeedSession[] = page.map(s => ({
    id: s.id,
    date: s.date,
    distance_km: s.distance_km,
    duration_seconds: s.duration_seconds,
    feel: s.feel,
    note: s.note,
    athlete_id: s.athlete_id,
    coach_user_id: s.coach_user_id,
    strava_title: s.strava_title,
    athlete_name: athleteMap[s.athlete_id] ?? 'Unknown athlete',
    coach_name: coachMap[s.coach_user_id ?? ''] ?? null,
  }))

  return { sessions: enriched, hasMore }
}
