'use client'

import { useState } from 'react'
import SessionListCard from './SessionListCard'
import type { SessionListItem } from './SessionListCard'

type WeekGroup = {
  label: string
  sessions: Array<SessionListItem & { formattedDate: string; formattedTime: string }>
}

type Props = {
  upcomingGroups: WeekGroup[]
  pastSessions: Array<SessionListItem & { formattedDate: string; formattedTime: string }>
  role: 'coach' | 'caregiver' | 'admin'
  isAdmin: boolean
  canManageSessions: boolean
}

export default function SessionsListView({ upcomingGroups, pastSessions, role, isAdmin, canManageSessions }: Props) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  return (
    <>
      {/* Tab toggle */}
      <div className="flex gap-0 mb-4 bg-surface-alt rounded-[10px] p-[3px]">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-150 ${
              tab === t
                ? 'bg-surface text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-text-muted'
            }`}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      {/* Upcoming tab */}
      {tab === 'upcoming' && (
        <div>
          {upcomingGroups.length === 0 && (
            <p className="text-sm text-text-hint text-center py-8">No upcoming sessions</p>
          )}
          {upcomingGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-text-hint tracking-[0.8px] uppercase mt-4 mb-2 pl-0.5">
                {group.label}
              </p>
              {group.sessions.map((session) => (
                <div key={session.id} className="mb-2.5">
                  <SessionListCard
                    session={session}
                    role={role}
                    isAdmin={isAdmin}
                    canManageSessions={canManageSessions}
                    formattedDate={session.formattedDate}
                    formattedTime={session.formattedTime}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Past tab */}
      {tab === 'past' && (
        <div>
          {pastSessions.length === 0 && (
            <p className="text-sm text-text-hint text-center py-8">No past sessions</p>
          )}
          {pastSessions.map((session) => (
            <div key={session.id} className="mb-2.5">
              <SessionListCard
                session={session}
                role={role}
                isAdmin={isAdmin}
                canManageSessions={canManageSessions}
                formattedDate={session.formattedDate}
                formattedTime={session.formattedTime}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
