import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import { formatSessionDate } from '@/lib/sessions/datetime'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Plus, CheckCircle } from 'lucide-react'
import SessionDraftActions from '@/components/sessions/SessionDraftActions'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Manage Sessions — ${club.name}` }
}

type SessionWithCounts = {
  id: string
  title: string | null
  session_start: string
  session_end: string | null
  location: string
  status: string
  pairings_stale: boolean
  pairings_published_at: string | null
  created_by: string
  notes: string | null
  coaches_available: number
  coaches_pending: number
  coaches_total: number
  athletes_attending: number
  athletes_pending: number
  athletes_total: number
}

export default async function AdminSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role, can_manage_sessions')
    .eq('id', user.id)
    .single()

  const isAdmin = callerUser?.role === 'admin'
  const canManage = callerUser?.role === 'coach' && callerUser?.can_manage_sessions
  if (!isAdmin && !canManage) redirect('/feed')

  const club = await getClub()

  // Fetch all sessions with RSVP counts
  const { data: rawSessions } = await adminClient
    .from('training_sessions')
    .select('id, title, session_start, session_end, location, status, pairings_stale, pairings_published_at, created_by, notes')
    .eq('club_id', club.id)
    .order('session_start', { ascending: false })

  // Fetch RSVP counts for all sessions
  const sessionIds = (rawSessions ?? []).map((s) => s.id)

  const [{ data: coachRsvps }, { data: athleteRsvps }] = await Promise.all([
    adminClient
      .from('session_coach_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['']),
    adminClient
      .from('session_athlete_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['']),
  ])

  // Build count maps
  const coachCounts: Record<string, { available: number; pending: number; total: number }> = {}
  const athleteCounts: Record<string, { attending: number; pending: number; total: number }> = {}

  for (const r of coachRsvps ?? []) {
    if (!coachCounts[r.session_id]) coachCounts[r.session_id] = { available: 0, pending: 0, total: 0 }
    coachCounts[r.session_id].total++
    if (r.status === 'available') coachCounts[r.session_id].available++
    if (r.status === 'pending') coachCounts[r.session_id].pending++
  }

  for (const r of athleteRsvps ?? []) {
    if (!athleteCounts[r.session_id]) athleteCounts[r.session_id] = { attending: 0, pending: 0, total: 0 }
    athleteCounts[r.session_id].total++
    if (r.status === 'attending') athleteCounts[r.session_id].attending++
    if (r.status === 'pending') athleteCounts[r.session_id].pending++
  }

  const sessions: SessionWithCounts[] = (rawSessions ?? []).map((s) => ({
    ...s,
    coaches_available: coachCounts[s.id]?.available ?? 0,
    coaches_pending: coachCounts[s.id]?.pending ?? 0,
    coaches_total: coachCounts[s.id]?.total ?? 0,
    athletes_attending: athleteCounts[s.id]?.attending ?? 0,
    athletes_pending: athleteCounts[s.id]?.pending ?? 0,
    athletes_total: athleteCounts[s.id]?.total ?? 0,
  }))

  const now = new Date()

  // Action needed: published sessions with stale pairings
  const actionNeeded = sessions.filter(
    (s) => s.status === 'published' && s.pairings_stale
  )

  // Upcoming: published sessions not yet past
  const upcoming = sessions
    .filter((s) => s.status === 'published' && new Date(s.session_start) > now)
    .sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime())

  // Drafts
  const drafts = sessions.filter((s) => s.status === 'draft')
    .sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime())

  // Recent: last 5 completed sessions
  const recent = sessions
    .filter((s) => s.status === 'completed')
    .slice(0, 5)

  return (
    <main className="px-3.5 pt-4 pb-24 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-extrabold text-text-primary m-0">Manage Sessions</h1>
      </div>

      {/* Action Needed */}
      {actionNeeded.length > 0 && (
        <section className="mb-5">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2">
            Action Needed
          </div>
          {actionNeeded.map((s) => (
            <div
              key={s.id}
              className="bg-amber-50 border border-amber-200 border-l-[5px] border-l-amber-400 rounded-[10px] p-3.5 mb-2"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-[13px] font-bold text-amber-900">
                  {formatSessionDate(s.session_start, club.timezone)} — Pairings need review
                </span>
              </div>
              <div className="text-xs text-amber-800 mb-2.5">
                RSVP changes detected since pairings were published — some athletes may need reassignment.
              </div>
              <Link
                href={`/admin/sessions/${s.id}/pairings`}
                className="inline-flex items-center gap-1 py-2 px-3.5 text-[13px] font-bold rounded-lg bg-amber-400 text-white border-none cursor-pointer no-underline"
              >
                Review Pairings <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-5">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Upcoming
          </div>
          {upcoming.map((s) => (
            <div
              key={s.id}
              className="bg-surface border border-border-subtle border-l-[5px] border-l-accent rounded-[10px] p-3.5 mb-2"
            >
              <div className="text-sm font-bold text-text-primary mb-0.5">
                {formatSessionDate(s.session_start, club.timezone)} — {s.location}
              </div>
              <div className="text-xs text-text-secondary mb-2 leading-relaxed whitespace-pre-line">
                Coaches: <strong>{s.coaches_available}/{s.coaches_total}</strong> available{s.coaches_pending > 0 && ` · ${s.coaches_pending} pending`}
                {'\n'}
                Athletes: <strong>{s.athletes_attending}/{s.athletes_total}</strong> attending{s.athletes_pending > 0 && ` · ${s.athletes_pending} pending`}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/sessions/${s.id}`}
                  className="inline-flex items-center gap-1 py-[7px] px-3 text-xs font-semibold rounded-md bg-surface text-accent border border-teal-200 cursor-pointer no-underline"
                >
                  View Details <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <section className="mb-5">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Drafts
          </div>
          {drafts.map((s) => (
            <div
              key={s.id}
              className="bg-surface border border-border-subtle border-l-[5px] border-l-text-hint rounded-[10px] p-3.5 mb-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-text-primary mb-0.5">
                    {formatSessionDate(s.session_start, club.timezone)} — {s.location}
                  </div>
                  {s.notes?.includes('auto-draft') && (
                    <div className="text-[11px] text-text-hint italic">
                      Auto-drafted from recurring template
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold py-0.5 px-2 rounded-full bg-surface-alt text-text-hint">
                  Draft
                </span>
              </div>
              <SessionDraftActions sessionId={s.id} />
            </div>
          ))}
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section className="mb-5">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
            Recent
          </div>
          {recent.map((s, i) => (
            <div
              key={s.id}
              className={`flex justify-between items-center py-2.5 ${
                i < recent.length - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <div>
                <span className="text-[13px] font-semibold text-text-primary">
                  {formatSessionDate(s.session_start, club.timezone)}
                </span>
                <span className="text-xs text-text-muted ml-1.5">
                  {s.coaches_total} coaches · {s.athletes_total} athletes
                </span>
              </div>
              <CheckCircle size={16} className="text-green-500" />
            </div>
          ))}
        </section>
      )}

      {/* New Session Button */}
      <Link
        href="/admin/sessions/new"
        className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[15px] font-bold rounded-[10px] bg-accent text-white border-none cursor-pointer min-h-[48px] shadow-[0_2px_8px_rgba(15,118,110,0.3)] no-underline"
      >
        <Plus size={18} /> New Session
      </Link>
    </main>
  )
}
