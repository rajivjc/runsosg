import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import AthleteTabs from '@/components/athlete/AthleteTabs'
import StickyHeader from '@/components/athlete/StickyHeader'
import { formatDate } from '@/lib/utils/dates'
import { calculateGoalProgress } from '@/lib/goals'
import type { GoalType } from '@/lib/goals'
import { computeWeeklyVolume, computeFeelTrend, computeDistanceTimeline } from '@/lib/analytics/session-trends'
import type { MilestonePin } from '@/lib/analytics/session-trends'
import CheerViewTracker from '@/components/feed/CheerViewTracker'
import { getAthletePhotosPaginated, getAthletePhotos, getAthletePhotoCount, withSignedUrls } from '@/lib/media'
import { addCoachNote } from './actions'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: athlete } = await adminClient
    .from('athletes')
    .select('name')
    .eq('id', params.id)
    .single()
  return { title: athlete ? `${athlete.name} — SOSG Running Club` : 'Athlete — SOSG Running Club' }
}

export default async function AthleteHubPage({ params }: PageProps) {
  const { id } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentUserRow } = user
    ? await adminClient.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  const isReadOnly = currentUserRow?.role === 'caregiver'

  const [
    { data: athlete },
    { data: sessions },
    { data: cues },
    { data: notes },
    { data: milestones },
    { data: cheers },
  ] = await Promise.all([
    adminClient
      .from('athletes')
      .select('id, name, photo_url, active, date_of_birth, running_goal, goal_type, goal_target, communication_notes, medical_notes, emergency_contact')
      .eq('id', id)
      .single(),

    adminClient
      .from('sessions')
      .select('id, date, created_at, distance_km, duration_seconds, feel, note, sync_source, coach_user_id, strava_activity_id, strava_title, avg_heart_rate, max_heart_rate')
      .eq('athlete_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),

    adminClient
      .from('cues')
      .select('*')
      .eq('athlete_id', id)
      .single(),

    adminClient
      .from('coach_notes')
      .select('id, content, created_at, coach_user_id, users(email, name)')
      .eq('athlete_id', id)
      .order('created_at', { ascending: false }),

    adminClient
      .from('milestones')
      .select('id, label, achieved_at, session_id, milestone_definitions(icon)')
      .eq('athlete_id', id)
      .order('achieved_at', { ascending: false }),
    adminClient
      .from('cheers')
      .select('id, message, created_at, viewed_at')
      .eq('athlete_id', id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const flatNotes = (notes ?? []).map((n: any) => ({
    ...n,
    coach_email: n.users?.email ?? null,
    coach_name: n.users?.name ?? null,
  }))

  // Build a map of coach user_id -> display name from the users we already fetched
  const coachIds = [...new Set((sessions ?? []).map((s: any) => s.coach_user_id).filter(Boolean))]
  const [{ data: coachUsers }, { photos: paginatedPhotos, nextCursor }, photoCount, rawSessionPhotos] = await Promise.all([
    coachIds.length > 0
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] }),
    getAthletePhotosPaginated(id, 24),
    getAthletePhotoCount(id),
    getAthletePhotos(id), // for session→photo mapping (all photos needed for run cards)
  ])
  const coachMap = Object.fromEntries(
    (coachUsers ?? []).map((u: any) => [u.id, u.name ?? u.email?.split('@')[0] ?? null])
  )
  const flatSessions = (sessions ?? []).map((s: any) => ({
    ...s,
    coach_name: coachMap[s.coach_user_id] ?? null,
  }))

  const flatMilestones = (milestones ?? []).map((m: any) => ({
    id: m.id,
    label: m.label,
    achieved_at: m.achieved_at,
    session_id: m.session_id ?? null,
    icon: (m.milestone_definitions as any)?.icon ?? undefined,
  }))

  // Enrich photos with signed URLs
  // Paginated photos for the Photos tab (first page)
  const tabPhotos = await withSignedUrls(paginatedPhotos)
  const flatTabPhotos = tabPhotos.map(p => ({
    id: p.id,
    session_id: p.session_id,
    signed_url: p.signed_url,
    caption: p.caption,
    created_at: p.created_at,
  }))

  // Session photos for run card thumbnails (all photos, used for mapping)
  const sessionPhotos = await withSignedUrls(rawSessionPhotos)
  const flatSessionPhotos = sessionPhotos.map(p => ({
    id: p.id,
    session_id: p.session_id,
    signed_url: p.signed_url,
    caption: p.caption,
    created_at: p.created_at,
  }))
  const photosBySession: Record<string, typeof flatSessionPhotos> = {}
  for (const p of flatSessionPhotos) {
    if (!p.session_id) continue
    if (!photosBySession[p.session_id]) photosBySession[p.session_id] = []
    photosBySession[p.session_id].push(p)
  }

  // Chart data — computed from already-fetched sessions (no new queries)
  // Filter out sessions with missing dates to avoid Invalid Date errors
  const chartSessions = (sessions ?? [])
    .filter((s: any) => s.date != null && s.date !== '')
    .map((s: any) => ({
      date: s.date as string,
      distance_km: s.distance_km as number | null,
      duration_seconds: s.duration_seconds as number | null,
      feel: s.feel as number | null,
    }))

  const weeklyVolume = computeWeeklyVolume(chartSessions, 12)
  const feelTrend = computeFeelTrend(chartSessions)
  const distanceTimeline = computeDistanceTimeline(chartSessions)
  const milestonePins: MilestonePin[] = flatMilestones
    .filter(m => m.achieved_at != null)
    .map(m => ({
    date: m.achieved_at.split('T')[0],
    label: m.label,
    icon: m.icon ?? '🏆',
  }))

  // Backward-compatible weeklyData for RunsTab (still used for the legacy bar chart)
  const weeklyData = weeklyVolume.map(w => ({
    label: w.weekLabel,
    km: w.totalKm,
    weekStart: w.weekStart,
  }))

  if (!athlete) {
    notFound()
  }

  // Goal progress (no new query — uses already-fetched sessions)
  const goalProgress = athlete.goal_type && athlete.goal_target
    ? calculateGoalProgress(
        athlete.goal_type as GoalType,
        Number(athlete.goal_target),
        (sessions ?? []).filter((s: any) => s.date) // completed sessions already filtered by athlete
      )
    : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <StickyHeader
        athleteName={athlete.name}
        athleteId={id}
        backHref="/athletes"
        backLabel="Athletes"
        showEdit={!isReadOnly}
      />

      <Link
        href="/athletes"
        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors mb-4"
      >
        <ChevronLeft size={16} />
        Athletes
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">{athlete.name}</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/story/${id}`}
            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
            aria-label="View journey story"
            title="Journey story"
          >
            <Share2 size={18} />
          </Link>
          {!isReadOnly && (
            <Link
              href={`/athletes/${id}/edit`}
              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
              aria-label="Edit athlete profile"
            >
              <Pencil size={18} />
            </Link>
          )}
        </div>
      </div>

      {/* Profile strip */}
      {(athlete.running_goal || athlete.medical_notes || athlete.emergency_contact || athlete.communication_notes) && (
        <div className="mb-6 bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
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
      )}

      {/* Goal progress */}
      {goalProgress && (
        <div className="mb-6 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-teal-800">🎯 {goalProgress.label}</span>
            <span className="text-[10px] text-teal-600 font-medium">
              {goalProgress.current} / {goalProgress.target} {goalProgress.unit}
            </span>
          </div>
          <div className="w-full bg-teal-100 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${goalProgress.pct}%` }}
            />
          </div>
          {goalProgress.pct >= 100 && (
            <p className="text-[10px] text-teal-600 mt-1 font-medium">Goal achieved! 🎉</p>
          )}
          {goalProgress.pct >= 75 && goalProgress.pct < 100 && (
            <p className="text-[10px] text-teal-600 mt-1">Almost there!</p>
          )}
        </div>
      )}

      {/* Cheers from home */}
      {(cheers ?? []).length > 0 && (
        <div className="mb-6">
          {!isReadOnly && (
            <CheerViewTracker
              unviewedCheerIds={(cheers ?? []).filter((c: any) => !c.viewed_at).map((c: any) => c.id)}
            />
          )}
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2">Cheers from home 📣</p>
          <div className="space-y-1.5">
            {(cheers ?? []).map((c: any) => (
              <div key={c.id} className="bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-sm text-amber-800">&ldquo;{c.message}&rdquo;</p>
                <p className="text-[10px] text-amber-400 mt-0.5">{formatDate(c.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AthleteTabs
        athlete={athlete}
        sessions={flatSessions}
        cues={cues ?? null}
        notes={flatNotes}
        milestones={flatMilestones}
        photos={flatTabPhotos}
        photosBySession={photosBySession}
        photoCursor={nextCursor}
        photoCount={photoCount}
        weeklyData={weeklyData}
        weeklyVolume={weeklyVolume}
        feelTrend={feelTrend}
        distanceTimeline={distanceTimeline}
        milestonePins={milestonePins}
        addCoachNote={addCoachNote}
        isReadOnly={isReadOnly}
        currentUserId={user?.id}
      />
    </main>
  )
}
