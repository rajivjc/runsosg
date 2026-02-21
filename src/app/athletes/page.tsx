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

  const showStravaBanner = !!user && !stravaConnection

  const { data: userRow } = user
    ? await adminClient.from('users').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = userRow?.role === 'admin'

  const [{ data: athletes }, { data: sessions }] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, photo_url, active')
      .eq('active', true)
      .order('name', { ascending: true }),
    supabase
      .from('sessions')
      .select('athlete_id, date')
      .order('date', { ascending: false }),
  ])

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
    }
  })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Athletes</h1>
        {isAdmin && (
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
