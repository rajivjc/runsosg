import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'

interface PageProps {
  params: { id: string }
}

const getStoryData = cache(async (athleteId: string) => {
  const [
    { data: athlete },
    { data: sessions },
    { data: milestones },
  ] = await Promise.all([
    adminClient
      .from('athletes')
      .select('id, name, joined_at, running_goal, created_at')
      .eq('id', athleteId)
      .single(),
    adminClient
      .from('sessions')
      .select('id, date, distance_km, feel')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .order('date', { ascending: true }),
    adminClient
      .from('milestones')
      .select('id, label, achieved_at, milestone_definitions(icon)')
      .eq('athlete_id', athleteId)
      .order('achieved_at', { ascending: true }),
  ])

  if (!athlete) return null

  return { athlete, sessions: sessions ?? [], milestones: milestones ?? [] }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getStoryData(params.id)
  if (!data) return { title: 'Story Not Found' }

  const { athlete, sessions, milestones } = data
  const totalKm = sessions.reduce((sum, s: any) => sum + (s.distance_km ?? 0), 0)

  const description = `${athlete.name} has completed ${sessions.length} session${sessions.length !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km with ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} at SOSG Running Club.`

  return {
    title: `${athlete.name}'s Journey — SOSG Running Club`,
    description,
    openGraph: {
      title: `${athlete.name}'s Running Journey`,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${athlete.name}'s Running Journey`,
      description,
    },
  }
}

export default async function StoryPage({ params }: PageProps) {
  const data = await getStoryData(params.id)
  if (!data) notFound()

  const { athlete, sessions, milestones } = data
  const totalKm = sessions.reduce((sum, s: any) => sum + (s.distance_km ?? 0), 0)
  const sessionsWithFeel = sessions.filter((s: any) => s.feel != null)
  const avgFeel = sessionsWithFeel.length > 0
    ? sessionsWithFeel.reduce((sum, s: any) => sum + s.feel, 0) / sessionsWithFeel.length
    : 0

  // Determine start date
  const startDate = athlete.joined_at
    ?? (sessions.length > 0 ? sessions[0].date : null)
    ?? athlete.created_at

  const startFormatted = startDate
    ? new Date(startDate).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
    : null

  // Build narrative
  const narrative: string[] = []

  if (startFormatted) {
    narrative.push(`${athlete.name} started running with SOSG Running Club in ${startFormatted}.`)
  } else {
    narrative.push(`${athlete.name} is part of the SOSG Running Club family.`)
  }

  if (sessions.length > 0) {
    const firstDate = new Date(sessions[0].date)
    const lastDate = new Date(sessions[sessions.length - 1].date)
    const monthsDiff = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (30 * 24 * 60 * 60 * 1000)))

    if (monthsDiff <= 1) {
      narrative.push(`In their first month, they completed ${sessions.length} session${sessions.length !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km.`)
    } else {
      narrative.push(`Over ${monthsDiff} months, they've completed ${sessions.length} session${sessions.length !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km.`)
    }
  }

  if (milestones.length > 0) {
    narrative.push(`They've earned ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} along the way.`)
  }

  if (avgFeel >= 4) {
    narrative.push(`Every run is an adventure — and ${athlete.name} brings the energy every time.`)
  } else if (avgFeel >= 3) {
    narrative.push(`Session by session, ${athlete.name} keeps showing up and growing stronger.`)
  } else if (sessions.length > 0) {
    narrative.push(`Every step forward counts — and ${athlete.name} keeps taking them.`)
  }

  if (athlete.running_goal) {
    narrative.push(`Their goal: ${athlete.running_goal}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://runsosg.vercel.app'

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
        <span className="text-7xl mb-4">🏃</span>
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">Running Journey</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{athlete.name}</h1>

        {/* Stats row */}
        {sessions.length > 0 && (
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{sessions.length}</p>
              <p className="text-[10px] text-gray-400 font-medium">runs</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalKm.toFixed(1)}</p>
              <p className="text-[10px] text-gray-400 font-medium">km</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{milestones.length}</p>
              <p className="text-[10px] text-gray-400 font-medium">milestones</p>
            </div>
          </div>
        )}

        {/* Narrative */}
        <div className="space-y-2 mb-6">
          {narrative.map((line, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">{line}</p>
          ))}
        </div>

        {/* Milestone badges */}
        {milestones.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {milestones.map((m: any) => (
              <span key={m.id} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {m.milestone_definitions?.icon ?? '🏆'} {m.label}
              </span>
            ))}
          </div>
        )}

        <div className="w-12 h-0.5 bg-teal-200 mb-6" />

        <div className="flex flex-col items-center gap-4">
          <ShareButton
            title={`${athlete.name}'s Running Journey`}
            text={`${athlete.name} has completed ${sessions.length} run${sessions.length !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km with SOSG Running Club. Growing together!`}
            url={`${appUrl}/story/${params.id}`}
            buttonText="Share this story"
          />
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">SOSG Running Club — Growing Together</p>
        </div>
      </div>
    </div>
  )
}
