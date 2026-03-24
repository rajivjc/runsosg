import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { formatDate, formatDuration } from '@/lib/utils/dates'
import { getClub } from '@/lib/club'
import { ResolveForm } from './ResolveForm'

export async function generateMetadata(): Promise<Metadata> {
  const { getClub } = await import('@/lib/club')
  const club = await getClub()
  return { title: `Link Run to Athlete — ${club.name}` }
}

export default async function UnmatchedRunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRow || userRow.role === 'caregiver') {
    redirect('/feed')
  }

  const { data: unmatched } = await adminClient
    .from('strava_unmatched')
    .select('*')
    .eq('id', id)
    .single()

  if (!unmatched) {
    redirect('/notifications')
  }

  const club = await getClub()
  const activity = unmatched.activity_data as Record<string, any>
  const isResolved = unmatched.resolved_at != null

  // Fetch active athletes for the picker
  const { data: athletes } = await adminClient
    .from('athletes')
    .select('id, name')
    .eq('active', true)
    .order('name')

  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/notifications"
          className="text-text-hint hover:text-text-secondary text-sm font-medium"
        >
          &larr; Notifications
        </Link>
        <h1 className="text-xl font-bold text-text-primary">Link Run to Athlete</h1>
      </div>

      {/* Activity details */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4">
        <h2 className="font-semibold text-text-primary mb-2">
          {activity.name || 'Untitled Run'}
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary">
          {activity.start_date && (
            <div>
              <span className="text-text-hint">Date:</span>{' '}
              {formatDate(activity.start_date)}
            </div>
          )}
          {distanceKm && (
            <div>
              <span className="text-text-hint">Distance:</span>{' '}
              {distanceKm} km
            </div>
          )}
          {activity.moving_time && (
            <div>
              <span className="text-text-hint">Duration:</span>{' '}
              {formatDuration(activity.moving_time)}
            </div>
          )}
          {activity.average_heartrate && (
            <div>
              <span className="text-text-hint">Avg HR:</span>{' '}
              {Math.round(activity.average_heartrate)} bpm
            </div>
          )}
        </div>
      </div>

      {isResolved ? (
        <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-400/20 rounded-xl p-4 text-sm text-teal-800 dark:text-teal-300">
          This run has already been linked to an athlete.
        </div>
      ) : (
        <ResolveForm
          unmatchedId={id}
          athletes={athletes ?? []}
          hashtagPrefix={club.strava_hashtag_prefix ?? '#club'}
        />
      )}
    </main>
  )
}
