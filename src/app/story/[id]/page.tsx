import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'
import CloseButton from '@/components/milestone/CloseButton'
import { getHeroPhoto, getSignedUrl } from '@/lib/media'

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
      .select('id, name, joined_at, running_goal, created_at, allow_public_sharing')
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

  // Fetch hero photo
  const heroPhoto = await getHeroPhoto(athleteId)
  let heroPhotoUrl: string | null = null
  if (heroPhoto) {
    heroPhotoUrl = await getSignedUrl(heroPhoto.storage_path, heroPhoto.url)
  }

  return { athlete, sessions: sessions ?? [], milestones: milestones ?? [], heroPhotoUrl }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getStoryData(params.id)
  if (!data) return { title: 'Story Not Found' }

  const { athlete, sessions, milestones, heroPhotoUrl } = data
  const isPublic = (athlete as Record<string, unknown>).allow_public_sharing === true

  if (!isPublic) {
    return {
      title: 'Private — SOSG Running Club',
      robots: { index: false, follow: false },
    }
  }

  const totalKm = sessions.reduce((sum, s: any) => sum + (s.distance_km ?? 0), 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const ogImageUrl = `${appUrl}/api/story/${params.id}/image`

  const description = `${athlete.name} has completed ${sessions.length} session${sessions.length !== 1 ? 's' : ''} covering ${totalKm.toFixed(1)}km with ${milestones.length} milestone${milestones.length !== 1 ? 's' : ''} at SOSG Running Club.`

  return {
    title: `${athlete.name}'s Journey — SOSG Running Club`,
    description,
    openGraph: {
      title: `${athlete.name}'s Running Journey`,
      description,
      type: 'profile',
      images: heroPhotoUrl
        ? [{ url: heroPhotoUrl }]
        : [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${athlete.name}'s Running Journey`,
      description,
      images: heroPhotoUrl ? [heroPhotoUrl] : [ogImageUrl],
    },
  }
}

export default async function StoryPage({ params }: PageProps) {
  const data = await getStoryData(params.id)
  if (!data) notFound()

  const { athlete, sessions, milestones, heroPhotoUrl } = data
  const isPublic = (athlete as Record<string, unknown>).allow_public_sharing === true

  // Logged-in coaches/admins can always view stories
  let canView = isPublic
  if (!canView) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userRow } = await adminClient.from('users').select('role').eq('id', user.id).single()
      if (userRow?.role === 'admin' || userRow?.role === 'coach') {
        canView = true
      }
    }
  }

  if (!canView) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
          <span className="text-5xl mb-4">🔒</span>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This profile is private</h1>
          <p className="text-sm text-gray-500 mb-6">
            This athlete&apos;s running journey is not publicly shared.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full px-6 py-3 transition-colors"
          >
            Sign in
          </Link>
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mt-6">SOSG Running Club</p>
        </div>
      </div>
    )
  }

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
    ? new Date(startDate).toLocaleDateString('en-SG', { month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' })
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
      <CloseButton />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
        {/* Hero photo or running emoji fallback */}
        {heroPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroPhotoUrl}
            alt={`${athlete.name} running`}
            className="w-28 h-28 rounded-full object-cover mb-4 ring-4 ring-teal-100 shadow-lg"
          />
        ) : (
          <span className="text-7xl mb-4">🏃</span>
        )}
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
        <p className="text-[10px] text-white/40 text-center mt-4 max-w-xs">
          This page shows {athlete.name}&apos;s running achievements only. No personal details, notes, or contact information are included.
        </p>
      </div>
    </div>
  )
}
