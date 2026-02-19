import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AthleteTabs from '@/components/athlete/AthleteTabs'
import { addCoachNote } from './actions'

interface PageProps {
  params: { id: string }
}

export default async function AthleteHubPage({ params }: PageProps) {
  const { id } = params
  const supabase = await createClient()

  const [
    { data: athlete },
    { data: sessions },
    { data: cues },
    { data: notes },
    { data: milestones },
  ] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, photo_url, active')
      .eq('id', id)
      .single(),

    supabase
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, sync_source, coach_user_id')
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
      .select('id, content, created_at, coach_user_id')
      .eq('athlete_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('milestones')
      .select('id, label, achieved_at')
      .eq('athlete_id', id)
      .order('achieved_at', { ascending: false }),
  ])

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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{athlete.name}</h1>

      <AthleteTabs
        athlete={athlete}
        sessions={sessions ?? []}
        cues={cues ?? null}
        notes={notes ?? []}
        milestones={milestones ?? []}
        addCoachNote={addCoachNote}
      />
    </main>
  )
}
