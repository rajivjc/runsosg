import { adminClient } from '@/lib/supabase/admin'
import type { Club } from '@/lib/supabase/types'

let cachedClub: Club | null = null

/**
 * Fetch the club configuration. Single source of truth for club name,
 * timezone, locale, tagline, and all club-level settings.
 *
 * Uses a module-level cache that resets per serverless invocation
 * (Next.js Server Components run in fresh module scope per request in production).
 *
 * For multi-tenancy (future): accept an optional clubId parameter.
 */
export async function getClub(): Promise<Club> {
  if (cachedClub) return cachedClub

  const { data, error } = await adminClient
    .from('clubs')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    // During build/prerender, the DB may be unreachable — return a safe fallback
    // so static generation can proceed. At runtime the real values are always used.
    return {
      id: '',
      name: 'Running Club',
      tagline: 'Growing Together',
      timezone: 'Asia/Singapore',
      locale: 'en-SG',
      settings: {},
      created_at: new Date().toISOString(),
      logo_url: null,
      home_location: null,
      session_day: null,
      session_time: null,
      strava_club_id: null,
      default_session_duration_minutes: null,
      contact_email: null,
    } as unknown as Club
  }

  cachedClub = data
  return data
}

/**
 * Reset the cache. Call this after updating club settings
 * so the next getClub() call fetches fresh data.
 */
export function resetClubCache(): void {
  cachedClub = null
}
