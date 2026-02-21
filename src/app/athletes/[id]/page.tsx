import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import AthleteTabs from '@/components/athlete/AthleteTabs'
import { addCoachNote } from './actions'

interface PageProps {
  params: { id: string }
}

export default async function AthleteHubPage({ params }: PageProps) {
  const { id } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentUserRow } = user
    ? await adminClient.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  const isReadOnly = currentUserRow?.role === 'caregiver'

  if (isReadOnly && user) {
    const { data: athleteLink } = await adminClient
      .from('athletes')
      .select('id')
      .eq('id', id)
      .eq('caregiver_user_id', user.id)
      .single()

    if (!athleteLink) {
      redirect('/athletes')
    }
  }

  const [
    { data: athlete },
    { data: sessions },
    { data: cues },
    { data: notes },
    { data: milestones },
  ] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, photo_url, active, date_of_birth, running_goal, communication_notes, medical_notes, emergency_contact')
      .eq('id', id)
      .single(),

    supabase
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, sync_source, coach_user_id, strava_activity_id, users(name, email)')
      .eq('athlete_id', id)
      .order('date', { ascending: false })
      .limit(50),

    supabase
      .from('cues')
      .select('*')
      .eq('athlete_id', id)
      .single(),

    supabase
      .from('coach_notes')
      .select('id, content, created_at, coach_user_id, users(email, name)')
      .eq('athlete_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('milestones')
      .select('id, label, achieved_at')
      .eq('athlete_id', id)
      .order('achieved_at', { ascending: false }),
  ])

  const flatNotes = (notes ?? []).map((n: any) => ({
    ...n,
    coach_email: n.users?.email ?? null,
    coach_name: n.users?.name ?? null,
  }))

  const flatSessions = (sessions ?? []).map((s: any) => ({
    ...s,
    coach_name: s.users?.name ?? (s.users?.email ? s.users.email.split('@')[0] : null),
  }))

  if (!athlete) {
    notFound()
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <Link
        href="/athletes"
        className="inline-flex items-center gap-1 text-sm text-teal-600 mb-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Athletes
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{athlete.name}</h1>
        {!isReadOnly && (
          <Link
            href={`/athletes/${id}/edit`}
            className="text-gray-400 hover:text-teal-600 transition-colors"
            aria-label="Edit athlete profile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </Link>
        )}
      </div>

      {/* Profile strip */}
      <div className="mb-6 space-y-1.5">
        {athlete.running_goal && (
          <p className="text-sm text-teal-700 font-medium line-clamp-1">🎯 {athlete.running_goal}</p>
        )}
        {athlete.medical_notes && (
          <p className="text-sm text-orange-700 line-clamp-2">🏥 {athlete.medical_notes}</p>
        )}
        {athlete.emergency_contact && (
          <p className="text-sm text-gray-600 line-clamp-1">📞 {athlete.emergency_contact}</p>
        )}
        {athlete.communication_notes && (
          <p className="text-sm text-gray-500 line-clamp-2">💬 {athlete.communication_notes}</p>
        )}
      </div>

      <AthleteTabs
        athlete={athlete}
        sessions={flatSessions}
        cues={cues ?? null}
        notes={flatNotes}
        milestones={milestones ?? []}
        addCoachNote={addCoachNote}
        isReadOnly={isReadOnly}
      />
    </main>
  )
}
