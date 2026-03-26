import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getClub } from '@/lib/club'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Athletes — ${club.name}` }
}
import AthleteSearch from '@/components/athletes/AthleteSearch'
import { adminClient } from '@/lib/supabase/admin'
import StravaConnectBanner from '@/components/athletes/StravaConnectBanner'
import Link from 'next/link'

export type AthleteListItem = {
  id: string
  name: string
  photoUrl: string | null
  avatar: string | null
  totalSessions: number
  lastSessionDate: string | null
  recentFeels: number[]
}

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: { connected?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user metadata and athlete data in a single parallel batch
  const [
    { data: stravaConnection },
    { data: userRow },
    { data: athletes },
    { data: sessions },
    { data: recentFeels },
  ] = await Promise.all([
    user
      ? adminClient.from('strava_connections').select('user_id').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? adminClient.from('users').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    adminClient
      .from('athletes')
      .select('id, name, photo_url, active, avatar')
      .eq('active', true)
      .order('name', { ascending: true }),
    adminClient
      .from('sessions')
      .select('athlete_id, date')
      .is('strava_deleted_at', null)
      .order('date', { ascending: false }),
    adminClient
      .from('sessions')
      .select('athlete_id, feel, date')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .not('feel', 'is', null)
      .order('date', { ascending: false })
      .limit(500),
  ])

  const isAdmin = userRow?.role === 'admin'
  const isCaregiver = userRow?.role === 'caregiver'
  const showStravaBanner = !!user && !stravaConnection && !isCaregiver

  const feelsByAthlete: Record<string, number[]> = {}
  for (const s of recentFeels ?? []) {
    if (!feelsByAthlete[s.athlete_id]) feelsByAthlete[s.athlete_id] = []
    if (feelsByAthlete[s.athlete_id].length < 5 && s.feel !== null) {
      feelsByAthlete[s.athlete_id].push(s.feel)
    }
  }

  // Index sessions by athlete_id for O(n) lookup instead of O(n*m) filtering
  const sessionCountByAthlete: Record<string, number> = {}
  const lastSessionByAthlete: Record<string, string> = {}
  for (const s of sessions ?? []) {
    sessionCountByAthlete[s.athlete_id] = (sessionCountByAthlete[s.athlete_id] ?? 0) + 1
    // Sessions are ordered by date desc, so first occurrence is the latest
    if (!lastSessionByAthlete[s.athlete_id]) {
      lastSessionByAthlete[s.athlete_id] = s.date as string
    }
  }

  const athleteList: AthleteListItem[] = (athletes ?? []).map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    photoUrl: athlete.photo_url,
    avatar: athlete.avatar ?? null,
    totalSessions: sessionCountByAthlete[athlete.id] ?? 0,
    lastSessionDate: lastSessionByAthlete[athlete.id] ?? null,
    recentFeels: feelsByAthlete[athlete.id] ?? [],
  }))

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Athletes</h1>
        {isAdmin && !isCaregiver && (
          <Link
            href="/admin/athletes/new"
            className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-medium rounded-lg px-4 py-2 transition-colors shadow-sm"
          >
            + Add athlete
          </Link>
        )}
      </div>

      {searchParams.connected === 'strava' && (
        <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-400/20 px-4 py-3 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
          <span className="text-green-600 dark:text-green-300 font-bold">✓</span>
          <span>Strava connected! Your runs will now sync automatically.</span>
        </div>
      )}
      {showStravaBanner && <StravaConnectBanner />}

      {athleteList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-base font-semibold text-text-primary mb-1">No athletes yet</p>
          <p className="text-sm text-text-muted mb-4">
            {isAdmin
              ? 'Add your first athlete to start tracking their running journey.'
              : 'Athletes will appear here once an admin adds them.'}
          </p>
          {isAdmin && (
            <Link
              href="/admin/athletes/new"
              className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
              style={{ minHeight: '44px' }}
            >
              + Add athlete
            </Link>
          )}
        </div>
      ) : (
        <AthleteSearch athletes={athleteList} />
      )}
    </main>
  )
}
