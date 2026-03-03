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

  // Issue 3: Use Supabase joins to fetch athlete + coach names in one query
  const { data: rawSessions } = await adminClient
    .from('sessions')
    .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title, athletes(name), users!sessions_coach_user_id_fkey(name)')
    .eq('status', 'completed')
    .lt('date', cursor)
    .order('date', { ascending: false })
    .limit(limit + 1)

  const sessions = rawSessions ?? []
  const hasMore = sessions.length > limit
  const page = hasMore ? sessions.slice(0, limit) : sessions

  if (page.length === 0) return { sessions: [], hasMore: false }

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
    athlete_name: (s as unknown as { athletes?: { name?: string } }).athletes?.name ?? 'Unknown athlete',
    coach_name: (s as unknown as { users?: { name?: string } }).users?.name ?? null,
  }))

  return { sessions: enriched, hasMore }
}
