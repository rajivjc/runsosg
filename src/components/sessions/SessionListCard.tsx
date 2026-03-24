'use client'

import Link from 'next/link'
import { MapPin, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import SessionDraftActions from './SessionDraftActions'

export type SessionListItem = {
  id: string
  title: string | null
  session_start: string
  session_end: string | null
  location: string
  status: 'draft' | 'published' | 'completed' | 'cancelled'
  pairings_published_at: string | null
  coaches_available: number
  coaches_pending: number
  coaches_total: number
  athletes_attending: number
  athletes_pending: number
  athletes_total: number
  user_coach_rsvp: 'pending' | 'available' | 'unavailable' | null
  user_athlete_rsvps: { athlete_name: string; status: string }[]
  needs_pairings: boolean
}

type Props = {
  session: SessionListItem
  role: 'coach' | 'caregiver' | 'admin'
  isAdmin: boolean
  canManageSessions: boolean
  formattedDate: string
  formattedTime: string
}

function StatusBadge({ status, pairingsPublished }: { status: string; pairingsPublished: boolean }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
        <CheckCircle size={12} />
        Completed
      </span>
    )
  }

  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-raised text-text-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-text-hint" />
        Draft
      </span>
    )
  }

  if (pairingsPublished) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Pairings published
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      RSVPs open
    </span>
  )
}

function RsvpBadge({ status }: { status: string }) {
  if (!status || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300">
        <Clock size={13} /> Pending
      </span>
    )
  }
  if (status === 'available' || status === 'attending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-text">
        <CheckCircle size={13} /> {status === 'available' ? 'Available' : 'Attending'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <XCircle size={13} /> Not available
    </span>
  )
}

function getBorderColor(session: SessionListItem): string {
  if (session.status === 'draft') return 'border-l-text-hint'
  if (session.status === 'completed') return 'border-l-green-500'
  return 'border-l-accent'
}

export default function SessionListCard({ session, role, isAdmin, canManageSessions, formattedDate, formattedTime }: Props) {
  const isDraft = session.status === 'draft'
  const isCompleted = session.status === 'completed'
  const showManage = (isAdmin || canManageSessions) && !isDraft
  const borderColor = getBorderColor(session)

  const cardContent = (
    <div className={`bg-surface rounded-xl border border-border-subtle border-l-[5px] ${borderColor} px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
      {/* Header row */}
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <p className="text-sm font-bold text-text-primary">{formattedDate}</p>
          <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
            <MapPin size={12} /> {session.location}
          </p>
        </div>
        <StatusBadge status={session.status} pairingsPublished={!!session.pairings_published_at} />
      </div>

      {/* Time + Counts */}
      <p className="text-xs text-text-secondary mb-2">
        <span>{formattedTime}</span>
        {!isDraft && (
          <span className="ml-2">
            · {session.coaches_available} coaches · {session.athletes_attending} athletes
            {session.coaches_pending > 0 && (
              <span className="text-amber-600 dark:text-amber-300"> · {session.coaches_pending} pending</span>
            )}
          </span>
        )}
      </p>

      {/* Coach RSVP */}
      {!isDraft && !isCompleted && role === 'coach' && session.user_coach_rsvp !== null && (
        <div className="flex items-center gap-1.5 text-xs pt-1.5 border-t border-border-subtle">
          <span className="text-text-muted">Your RSVP:</span>
          <RsvpBadge status={session.user_coach_rsvp} />
        </div>
      )}

      {/* Caregiver athlete RSVPs */}
      {!isDraft && !isCompleted && role === 'caregiver' && session.user_athlete_rsvps.length > 0 && (
        <div className="pt-1.5 border-t border-border-subtle">
          {session.user_athlete_rsvps.map((rsvp) => (
            <div key={rsvp.athlete_name} className="flex items-center gap-1.5 text-xs mb-0.5">
              <span className="text-text-muted">{rsvp.athlete_name}:</span>
              <RsvpBadge status={rsvp.status} />
            </div>
          ))}
        </div>
      )}

      {/* Completed: participation */}
      {isCompleted && role === 'coach' && session.user_coach_rsvp === 'available' && (
        <div className="text-xs text-accent-text font-semibold pt-1.5 border-t border-border-subtle">
          You participated
        </div>
      )}

      {/* Admin/manager: Manage shortcut */}
      {showManage && (
        <div className="flex items-center justify-end pt-1.5 border-t border-border-subtle">
          <Link
            href={session.needs_pairings ? `/admin/sessions/${session.id}/pairings` : `/sessions/${session.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent-text hover:text-accent-hover"
          >
            Manage <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Draft: admin actions */}
      {isDraft && (isAdmin || canManageSessions) && (
        <div className="border-t border-border-subtle pt-2">
          <SessionDraftActions sessionId={session.id} />
        </div>
      )}
    </div>
  )

  // Draft cards are not linkable (they have action buttons instead)
  if (isDraft) return cardContent

  return (
    <Link href={`/sessions/${session.id}`} className="block">
      {cardContent}
    </Link>
  )
}
