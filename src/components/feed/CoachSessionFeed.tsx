'use client'

import { useState, useMemo } from 'react'
import SessionGroup from '@/components/feed/SessionGroup'
import AthleteFilter from '@/components/feed/AthleteFilter'
import type { FeedSession, MilestoneBadge } from '@/lib/feed/types'

interface Props {
  sessions: FeedSession[]
  groups: Record<string, FeedSession[]>
  milestonesBySession: Record<string, MilestoneBadge[]>
  kudosCounts: Record<string, number>
  myKudos: Set<string>
  userId: string
}

function groupByDate(sessions: FeedSession[]): Record<string, FeedSession[]> {
  const sgNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  const today = new Date(sgNow)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)

  const groups: Record<string, FeedSession[]> = {
    'Today': [], 'Yesterday': [], 'This week': [], 'Earlier': [],
  }

  for (const s of sessions) {
    if (!s.date) continue
    const d = new Date(s.date)
    if (isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) groups['Today'].push(s)
    else if (d.getTime() === yesterday.getTime()) groups['Yesterday'].push(s)
    else if (d >= weekAgo) groups['This week'].push(s)
    else groups['Earlier'].push(s)
  }
  return groups
}

export default function CoachSessionFeed({ sessions, groups, milestonesBySession, kudosCounts, myKudos, userId }: Props) {
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null)

  const athletes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sessions) {
      if (!seen.has(s.athlete_id)) {
        seen.set(s.athlete_id, s.athlete_name)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  const filteredGroups = useMemo(() => {
    if (!selectedAthlete) return groups
    const filtered = sessions.filter(s => s.athlete_id === selectedAthlete)
    return groupByDate(filtered)
  }, [selectedAthlete, sessions, groups])

  const showFilter = athletes.length > 1

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">👟</p>
        <p className="text-base font-semibold text-gray-900 mb-1">The club is quiet today</p>
        <p className="text-sm text-gray-500">Be the first to log a run!</p>
      </div>
    )
  }

  return (
    <>
      {showFilter && (
        <AthleteFilter
          athletes={athletes}
          selected={selectedAthlete}
          onSelect={setSelectedAthlete}
        />
      )}
      {Object.entries(filteredGroups).map(([label, items]) => (
        <SessionGroup
          key={label}
          label={label}
          sessions={items}
          milestonesBySession={milestonesBySession}
          kudosCounts={kudosCounts}
          myKudos={myKudos}
          isReadOnly={false}
          userId={userId}
        />
      ))}
    </>
  )
}
