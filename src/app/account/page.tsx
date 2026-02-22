import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import SignOutButton from '@/components/account/SignOutButton'
import StravaStatus from '@/components/account/StravaStatus'
import DisplayNameForm from '@/components/account/DisplayNameForm'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { setup?: string; connected?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const { data: connection } = await adminClient
    .from('strava_connections')
    .select('strava_athlete_id, token_expires_at, last_sync_at, last_sync_status, last_error, created_at')
    .eq('user_id', user.id)
    .single()

  const { data: statsData } = user ? await adminClient
    .from('sessions')
    .select('id, athlete_id, date')
    .eq('coach_user_id', user.id)
    .eq('status', 'completed')
    : { data: [] }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const totalSessions = (statsData ?? []).length
  const totalAthletes = new Set((statsData ?? []).map((s: any) => s.athlete_id)).size
  const thisMonth = (statsData ?? []).filter((s: any) => s.date >= monthStart).length

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      {/* Email */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Signed in as</p>
        <p className="text-sm font-medium text-gray-800">{user.email}</p>
      </section>

      {searchParams?.connected === 'strava' && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>Strava connected! Your runs will now sync automatically.</span>
        </div>
      )}

      {/* Display name */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Display name</p>
        {searchParams.setup === 'name' && (
          <div className="mb-3 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
            👋 Welcome! Please set your display name before getting started.
          </div>
        )}
        <DisplayNameForm currentName={userRow?.name ?? null} />
      </section>

      {/* Coaching stats */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your coaching stats</p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="flex flex-col items-center px-2">
              <span className="text-2xl font-bold text-gray-900">{totalSessions}</span>
              <span className="text-xs text-gray-400 mt-1 text-center">sessions</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-2xl font-bold text-gray-900">{totalAthletes}</span>
              <span className="text-xs text-gray-400 mt-1 text-center">athletes</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-2xl font-bold text-teal-600">{thisMonth}</span>
              <span className="text-xs text-gray-400 mt-1 text-center">this month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strava */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Strava</p>
        <StravaStatus connection={connection ?? null} />
      </section>

      {/* Sign out */}
      <section>
        <SignOutButton />
      </section>
    </main>
  )
}
