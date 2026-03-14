'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import type { FeedSession } from '@/lib/feed/types'

interface SessionRow {
  id: string
  date: string
  distance_km: number | null
  duration_seconds: number | null
  feel: number | null
  note: string | null
  athlete_id: string
  coach_user_id: string | null
  strava_title: string | null
  athletes: { name: string } | null
  users: { name: string } | null
}

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

  // Check role — caregivers only see their linked athlete's sessions
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = adminClient
    .from('sessions')
    .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title, athletes(name), users!sessions_coach_user_id_fkey(name)')
    .eq('status', 'completed')
    .is('strava_deleted_at', null)
    .lt('date', cursor)
    .order('date', { ascending: false })
    .limit(limit + 1)

  if (callerUser?.role === 'caregiver') {
    const { data: linked } = await adminClient
      .from('athletes')
      .select('id')
      .eq('caregiver_user_id', user.id)
      .single()
    if (linked) {
      query = query.eq('athlete_id', linked.id)
    } else {
      return { sessions: [], hasMore: false }
    }
  }

  const { data: rawSessions } = await query

  const sessions = (rawSessions ?? []) as unknown as SessionRow[]
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
    athlete_name: s.athletes?.name ?? 'Unknown athlete',
    coach_name: s.users?.name ?? null,
  }))

  return { sessions: enriched, hasMore }
}
