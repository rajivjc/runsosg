'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useClubConfig } from '@/components/providers/ClubConfigProvider'
import { formatSessionTimeRange, isSessionToday } from '@/lib/sessions/datetime'
import type { AssignmentCardData } from '@/lib/feed/types'

const GroupLogRunSheet = dynamic(() => import('./GroupLogRunSheet'))

interface Props {
  card: AssignmentCardData
}

export default function AssignmentCard({ card }: Props) {
  const { timezone } = useClubConfig()
  const router = useRouter()
  const { session, athletes, loggedRuns, allAthletes } = card
  const [logSheetOpen, setLogSheetOpen] = useState(false)

  const isToday = isSessionToday(session.sessionStart, timezone)
  const dayLabel = isToday ? 'TODAY' : 'TOMORROW'
  const timeRange = formatSessionTimeRange(session.sessionStart, session.sessionEnd, timezone)

  // Derive session date in YYYY-MM-DD from sessionStart in club timezone
  const sessionDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(session.sessionStart))

  const loggedCount = athletes.filter(a => loggedRuns[a.id]).length
  const allLogged = loggedCount > 0 && loggedCount === athletes.length
  const someLogged = loggedCount > 0

  return (
    <div className="bg-surface rounded-xl border border-border-subtle border-l-[5px] border-l-accent shadow-sm overflow-hidden">
      <div className="px-3.5 py-3.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-bold tracking-wide text-accent uppercase"
            style={{ letterSpacing: '0.5px' }}
          >
            {dayLabel}
          </span>
        </div>
        <div className="text-sm font-bold text-text-primary mb-0.5">
          {session.title ?? 'Training'} at {session.location}
        </div>
        <div className="text-xs text-text-muted mb-3.5">{timeRange}</div>

        <div className="text-xs font-semibold text-text-muted uppercase mb-2"
          style={{ letterSpacing: '0.5px' }}
        >
          Your athletes
        </div>

        <div className="flex flex-col gap-2 mb-3.5">
          {athletes.map(a => {
            const logged = loggedRuns[a.id]
            return (
              <div
                key={a.id}
                className="flex items-start gap-2.5 bg-accent-bg rounded-lg px-3 py-2.5"
              >
                <span className="text-lg leading-none">{a.avatar ?? '🏃'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text-primary">{a.name}</div>
                  {logged ? (
                    <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 mt-0.5">
                      <span>✓</span>
                      <span>
                        {logged.distance_km != null ? `${logged.distance_km}km` : 'Run'}{' '}
                        {logged.sync_source === 'strava_webhook' ? 'via Strava' : 'logged'}
                      </span>
                    </div>
                  ) : (
                    a.cues && (
                      <div className="text-xs text-text-secondary mt-0.5">
                        Cues: &ldquo;{a.cues}&rdquo;
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setLogSheetOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-bold rounded-lg bg-accent text-white border-none min-h-[44px] hover:bg-accent-hover active:scale-[0.97] transition-all duration-150"
        >
          {someLogged ? 'Log More' : 'Log Runs'}
        </button>
      </div>

      {logSheetOpen && (
        <GroupLogRunSheet
          isOpen={logSheetOpen}
          onClose={() => setLogSheetOpen(false)}
          onSaved={() => {
            setLogSheetOpen(false)
            router.refresh()
          }}
          trainingSessionId={session.id}
          sessionDate={sessionDate}
          assignedAthletes={athletes
            .filter(a => !loggedRuns[a.id])
            .map(a => ({
              id: a.id,
              name: a.name,
              avatar: a.avatar,
            }))}
          stravaSyncedAthletes={athletes
            .filter(a => loggedRuns[a.id]?.sync_source === 'strava_webhook')
            .map(a => ({
              id: a.id,
              name: a.name,
              avatar: a.avatar,
              distanceKm: loggedRuns[a.id]?.distance_km ?? null,
            }))}
          allAthletes={allAthletes}
        />
      )}
    </div>
  )
}
