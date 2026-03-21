import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import CloseButton from '@/components/milestone/CloseButton'
import { getStoryData } from '@/lib/story/data'
import { generateNarrative } from '@/lib/story/narrative'
import StoryHero from '@/components/story/StoryHero'
import StoryChapter from '@/components/story/StoryChapter'
import StoryProgress from '@/components/story/StoryProgress'
import StoryPhotoTimeline from '@/components/story/StoryPhotoTimeline'
import StoryCoachReflection from '@/components/story/StoryCoachReflection'
import StoryUpdateCard from '@/components/story/StoryUpdateCard'
import StoryFooter from '@/components/story/StoryFooter'
import PoweredByBadge from '@/components/ui/PoweredByBadge'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getStoryData(params.id)
  if (!data) return { title: 'Story Not Found' }

  const { athlete, sessions, milestones, heroPhotoUrl } = data
  const isPublic = athlete.allow_public_sharing === true

  if (!isPublic) {
    return {
      title: 'Private — SOSG Running Club',
      robots: { index: false, follow: false },
    }
  }

  const totalKm = sessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
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

  const { athlete, sessions, milestones, heroPhotoUrl, coachReflections, storyUpdates, monthlyPhotos } = data
  const isPublic = athlete.allow_public_sharing === true

  // Logged-in coaches/admins/linked caregivers can always view stories
  let canView = isPublic
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!canView && user) {
    const { data: userRow } = await adminClient.from('users').select('role').eq('id', user.id).single()
    if (userRow?.role === 'admin' || userRow?.role === 'coach') {
      canView = true
    } else if (userRow?.role === 'caregiver') {
      const { data: linked } = await adminClient
        .from('athletes')
        .select('id')
        .eq('caregiver_user_id', user.id)
        .eq('id', params.id)
        .single()
      if (linked) canView = true
    }
  }

  if (!canView) {
    if (user) {
      return (
        <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
            <span className="text-5xl mb-4">🔒</span>
            <h1 className="text-xl font-bold text-gray-900 mb-2">This profile is private</h1>
            <p className="text-sm text-gray-500 mb-6">
              Sharing is not enabled for this athlete yet. Ask the coach to enable sharing.
            </p>
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full px-6 py-3 transition-colors"
            >
              Back to home
            </Link>
            <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mt-6">SOSG Running Club</p>
          </div>
        </div>
      )
    }

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

  // Generate narrative
  const narrative = generateNarrative({
    athleteName: athlete.name,
    joinedAt: athlete.joined_at,
    runningGoal: athlete.running_goal,
    sessions: sessions.map(s => ({ date: s.date, distance_km: s.distance_km })),
    milestones: milestones.map(m => ({
      label: m.label,
      achieved_at: m.achieved_at,
      icon: m.icon,
    })),
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
      <CloseButton />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg px-8 py-10">
        {/* Hero */}
        <StoryHero
          athleteName={athlete.name}
          heroPhotoUrl={heroPhotoUrl}
          avatar={athlete.avatar ?? null}
          totalSessions={narrative.totalSessions}
          totalKm={narrative.totalKm}
          milestoneCount={milestones.length}
        />

        {/* Streak callout */}
        {narrative.streakCallout && (
          <p className="text-xs text-center text-teal-600 font-medium bg-teal-50 rounded-lg py-2 px-3 mb-6">
            {narrative.streakCallout}
          </p>
        )}

        {/* Chapters */}
        {narrative.chapters.map((chapter, i) => (
          <StoryChapter key={i} chapter={chapter} />
        ))}

        {/* Progress comparison */}
        <StoryProgress progress={narrative.progress} />

        {/* Photo timeline */}
        <StoryPhotoTimeline photos={monthlyPhotos} />

        {/* Coach reflections */}
        {coachReflections.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-3">
              Coach reflections
            </h2>
            <div className="space-y-3">
              {coachReflections.map(r => (
                <StoryCoachReflection key={r.id} reflection={r} />
              ))}
            </div>
          </section>
        )}

        {/* Story updates */}
        {storyUpdates.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-3">
              Updates
            </h2>
            <div>
              {storyUpdates.map(u => (
                <StoryUpdateCard key={u.id} update={u} />
              ))}
            </div>
          </section>
        )}

        {/* Running goal */}
        {athlete.running_goal && (
          <div className="text-center mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase mb-1">Goal</p>
            <p className="text-sm text-gray-600">{athlete.running_goal}</p>
          </div>
        )}

        <div className="w-12 h-0.5 bg-teal-200 mx-auto mb-6" />

        {/* Footer */}
        <StoryFooter
          athleteName={athlete.name}
          totalSessions={narrative.totalSessions}
          totalKm={narrative.totalKm}
          storyUrl={`${appUrl}/story/${params.id}`}
        />
      </div>
      <PoweredByBadge />
    </div>
  )
}
