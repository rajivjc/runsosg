'use client'

import Link from 'next/link'
import { ChevronLeft, Clock, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import YourRsvpSection from './YourRsvpSection'
import ProxyRsvpSection from './ProxyRsvpSection'
import RsvpStatusList from './RsvpStatusList'
import AssignmentSection from './AssignmentSection'
import SessionAdminActions from './SessionAdminActions'

export type SessionDetailData = {
  session: {
    id: string
    title: string | null
    session_start: string
    session_end: string | null
    location: string
    notes: string | null
    status: 'draft' | 'published' | 'completed' | 'cancelled'
    pairings_published_at: string | null
    pairings_stale: boolean
  }
  formattedDate: string
  formattedTimeRange: string
  coachRsvps: { id: string; name: string; status: string }[]
  athleteRsvps: { id: string; name: string; status: string }[]
  currentUserRole: 'admin' | 'coach' | 'caregiver'
  currentUserId: string
  currentUserCanManage: boolean
  currentCoachRsvp: 'pending' | 'available' | 'unavailable' | null
  currentCaregiverAthletes: { athlete_id: string; name: string; status: string }[]
  assignments: { coach_id: string; coach_name: string; athlete_id: string; athlete_name: string }[]
  athleteCues: Record<string, string>
  pairingsPublished: boolean
  pairingsStale: boolean
  sessionDate: string // YYYY-MM-DD in club timezone
  loggedRuns: Record<string, { distance_km: number | null; note: string | null }>
  allAthletes: { id: string; name: string; avatar: string | null }[]
}

export default function SessionDetail({ data }: { data: SessionDetailData }) {
  const {
    session,
    formattedDate,
    formattedTimeRange,
    coachRsvps,
    athleteRsvps,
    currentUserRole,
    currentUserId,
    currentUserCanManage,
    currentCoachRsvp,
    currentCaregiverAthletes,
    assignments,
    athleteCues,
    pairingsPublished,
    pairingsStale,
    sessionDate,
    loggedRuns,
    allAthletes,
  } = data

  const isAdmin = currentUserRole === 'admin'
  const isCoach = currentUserRole === 'coach'
  const isDraft = session.status === 'draft'
  const isPublished = session.status === 'published'
  const isCompleted = session.status === 'completed'
  const isCancelled = session.status === 'cancelled'

  return (
    <div className="px-4 pb-28">
      {/* Back nav */}
      <div className="py-3 pb-2">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-hint hover:text-text-muted"
        >
          <ChevronLeft size={16} />
          Sessions
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-extrabold text-text-primary m-0 mb-1">
            {session.title || 'Training'} — {formattedDate}
          </h1>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 shrink-0">
              <CheckCircle size={12} /> Completed
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 shrink-0">
              Cancelled
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-text-secondary">
          <Clock size={14} /> {formattedTimeRange}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-text-secondary mt-0.5">
          <MapPin size={14} /> {session.location}
        </div>
        {session.notes && (
          <div className="mt-2 px-2.5 py-2 bg-surface-alt rounded-md text-xs text-text-secondary italic">
            &ldquo;{session.notes}&rdquo;
          </div>
        )}
      </div>

      {/* Cancelled — minimal view */}
      {isCancelled && (
        <p className="text-sm text-text-muted">This session has been cancelled.</p>
      )}

      {/* Draft — admin actions only */}
      {isDraft && currentUserCanManage && (
        <SessionAdminActions
          sessionId={session.id}
          pairingsPublished={false}
          sessionStatus="draft"
        />
      )}

      {/* Published or Completed — full view */}
      {(isPublished || isCompleted) && (
        <>
          {/* Stale pairings banner (admin only) */}
          {(isAdmin || currentUserCanManage) && pairingsStale && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[10px] p-3 mb-4">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-amber-800 dark:text-amber-200">
                  Pairings need review
                </p>
                <p className="text-xs text-amber-900 dark:text-amber-300 mt-0.5">
                  RSVPs have changed since pairings were published. Review and update assignments.
                </p>
              </div>
            </div>
          )}

          {/* Your RSVP section — only for published, not completed */}
          {isPublished && !isCancelled && (
            <>
              {(isCoach || isAdmin) && currentCoachRsvp !== null && (
                <YourRsvpSection
                  type="coach"
                  sessionId={session.id}
                  status={currentCoachRsvp}
                />
              )}
              {currentUserRole === 'caregiver' && currentCaregiverAthletes.length > 0 && (
                <YourRsvpSection
                  type="caregiver"
                  sessionId={session.id}
                  athletes={currentCaregiverAthletes}
                />
              )}
            </>
          )}

          {/* Proxy RSVP (admin + coaches, only published) */}
          {isPublished && (isAdmin || isCoach) && (
            <>
              <ProxyRsvpSection
                sessionId={session.id}
                items={athleteRsvps.map(a => ({ id: a.id, name: a.name, status: a.status }))}
                type="athletes"
              />
              {isAdmin && (
                <ProxyRsvpSection
                  sessionId={session.id}
                  items={coachRsvps.map(c => ({ id: c.id, name: c.name, status: c.status }))}
                  type="coaches"
                />
              )}
            </>
          )}

          {/* Participant lists */}
          <RsvpStatusList
            title="Coaches"
            items={coachRsvps}
            positiveLabel="available"
            positiveStatus="available"
          />
          <RsvpStatusList
            title="Athletes"
            items={athleteRsvps}
            positiveLabel="attending"
            positiveStatus="attending"
          />

          {/* Assignments */}
          <AssignmentSection
            role={currentUserRole}
            pairingsPublished={pairingsPublished}
            assignments={assignments}
            currentUserId={currentUserId}
            currentCaregiverAthleteIds={currentCaregiverAthletes.map(a => a.athlete_id)}
            athleteCues={athleteCues}
            trainingSessionId={session.id}
            sessionDate={sessionDate}
            loggedRuns={loggedRuns}
            allAthletes={allAthletes}
          />

          {/* Admin actions — only for published */}
          {isPublished && currentUserCanManage && (
            <SessionAdminActions
              sessionId={session.id}
              pairingsPublished={pairingsPublished}
              sessionStatus="published"
            />
          )}
        </>
      )}
    </div>
  )
}
