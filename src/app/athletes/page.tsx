import { createClient } from '@/lib/supabase/server'
import AthleteSearch from '@/components/athletes/AthleteSearch'
import { adminClient } from '@/lib/supabase/admin'
import StravaConnectBanner from '@/components/athletes/StravaConnectBanner'
import Link from 'next/link'

export type AthleteListItem = {
  id: string
  name: string
  photoUrl: string | null
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

  const { data: stravaConnection } = user
    ? await adminClient
        .from('strava_connections')
        .select('user_id')
        .eq('user_id', user.id)
        .single()
    : { data: null }

  const { data: userRow } = user
    ? await adminClient.from('users').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = userRow?.role === 'admin'
  const isCaregiver = userRow?.role === 'caregiver'
  const showStravaBanner = !!user && !stravaConnection && !isCaregiver

  const [{ data: athletes }, { data: sessions }, { data: recentFeels }] = await Promise.all([
    adminClient
      .from('athletes')
      .select('id, name, photo_url, active')
      .eq('active', true)
      .order('name', { ascending: true }),
    adminClient
      .from('sessions')
      .select('athlete_id, date')
      .order('date', { ascending: false }),
    adminClient
      .from('sessions')
      .select('athlete_id, feel, date')
      .eq('status', 'completed')
      .not('feel', 'is', null)
      .order('date', { ascending: false }),
  ])

  const feelsByAthlete: Record<string, number[]> = {}
  for (const s of recentFeels ?? []) {
    if (!feelsByAthlete[s.athlete_id]) feelsByAthlete[s.athlete_id] = []
    if (feelsByAthlete[s.athlete_id].length < 5 && s.feel !== null) {
      feelsByAthlete[s.athlete_id].push(s.feel)
    }
  }

  const athleteList: AthleteListItem[] = (athletes ?? []).map((athlete) => {
    const athleteSessions = (sessions ?? []).filter(
      (s) => s.athlete_id === athlete.id
    )
    const lastSession = athleteSessions[0] ?? null
    return {
      id: athlete.id,
      name: athlete.name,
      photoUrl: athlete.photo_url,
      totalSessions: athleteSessions.length,
      lastSessionDate: lastSession ? (lastSession.date as string) : null,
      recentFeels: feelsByAthlete[athlete.id] ?? [],
    }
  })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Athletes</h1>
        {isAdmin && !isCaregiver && (
          <Link
            href="/admin/athletes/new"
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
          >
            + Add athlete
          </Link>
        )}
      </div>

      {searchParams.connected === 'strava' && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>Strava connected! Your runs will now sync automatically.</span>
        </div>
      )}
      {showStravaBanner && <StravaConnectBanner />}

      {athleteList.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No athletes found</p>
      ) : (
        <AthleteSearch athletes={athleteList} />
      )}
    </main>
  )
}
