'use client'

import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import type { SessionData, NoteData, MilestoneData } from './AthleteTabs'

type FeedTabProps = {
  sessions: SessionData[]
  notes: NoteData[]
  milestones: MilestoneData[]
}

const FEEL_EMOJI: Record<number, string> = {
  1: '😰',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🔥',
}

type FeedItem =
  | { type: 'session'; sortKey: string; data: SessionData }
  | { type: 'note'; sortKey: string; data: NoteData }
  | { type: 'milestone'; sortKey: string; data: MilestoneData }

function StravaLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 inline-block ml-1"
      aria-label="Strava"
      fill="#FC4C02"
    >
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

export default function FeedTab({ sessions, notes, milestones }: FeedTabProps) {
  const feedItems: FeedItem[] = [
    ...sessions.map((s) => ({ type: 'session' as const, sortKey: s.date, data: s })),
    ...notes.map((n) => ({ type: 'note' as const, sortKey: n.created_at, data: n })),
    ...milestones.map((m) => ({ type: 'milestone' as const, sortKey: m.achieved_at, data: m })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  if (feedItems.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12 text-sm">
        No activity yet. Sessions will appear here after runs are synced from Strava.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => {
        if (item.type === 'session') {
          const s = item.data
          return (
            <div
              key={`session-${s.id}`}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {s.distance_km != null
                        ? formatDistance(s.distance_km * 1000)
                        : '—'}
                      {s.duration_seconds != null && (
                        <span className="text-gray-500">
                          {' '}· {formatDuration(s.duration_seconds)}
                        </span>
                      )}
                    </span>
                    {s.feel != null && (
                      <span className="text-lg" aria-label={`Feel: ${s.feel}`}>
                        {FEEL_EMOJI[s.feel]}
                      </span>
                    )}
                    {s.sync_source === 'strava_webhook' && <StravaLogo />}
                  </div>
                  {s.note && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.note}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {formatDate(s.date)}
                </span>
              </div>
            </div>
          )
        }

        if (item.type === 'note') {
          const n = item.data
          return (
            <div
              key={`note-${n.id}`}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-blue-400"
            >
              <p className="text-sm text-gray-800">{n.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                  Coach note
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
              </div>
            </div>
          )
        }

        // milestone
        const m = item.data
        return (
          <div
            key={`milestone-${m.id}`}
            className="bg-teal-50 border border-teal-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🏆</span>
              <div>
                <p className="font-semibold text-teal-800 text-sm">{m.label}</p>
                <p className="text-xs text-teal-600">{formatDate(m.achieved_at)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
