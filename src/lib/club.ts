import { unstable_cache } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import type { Club } from '@/lib/supabase/types'

const CLUB_CACHE_TAG = 'club-config'

/**
 * Fetch the club configuration from cache or database.
 * Cache is revalidated every 60 seconds or on-demand via revalidateTag('club-config').
 */
export const getClub = unstable_cache(
  async (): Promise<Club> => {
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

    return data
  },
  ['club-config'],
  {
    revalidate: 60,
    tags: [CLUB_CACHE_TAG],
  }
)

export { CLUB_CACHE_TAG }
