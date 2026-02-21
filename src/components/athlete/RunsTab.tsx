'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import type { SessionData, MilestoneData } from './AthleteTabs'

type RunsTabProps = {
  sessions: SessionData[]
  milestones: MilestoneData[]
  isReadOnly?: boolean
  onSessionUpdated?: () => void
}

const FEEL_EMOJI: Record<number, string> = {
  1: '😰',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🔥',
}

const FEEL_LABELS: Record<number, string> = {
  1: 'Very hard',
  2: 'Hard',
  3: 'OK',
  4: 'Good',
  5: 'Great',
}

type Feel = 1 | 2 | 3 | 4 | 5

type FeedItem =
  | { type: 'session'; sortKey: string; data: SessionData }
  | { type: 'milestone'; sortKey: string; data: MilestoneData }

function StravaLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 inline-block ml-1" aria-label="Strava" fill="#FC4C02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

type SessionCardProps = {
  session: SessionData
  isReadOnly: boolean
  onUpdated?: () => void
}

function SessionCard({ session: s, isReadOnly, onUpdated }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feel, setFeel] = useState<Feel | null>(s.feel as Feel | null)
  const [note, setNote] = useState(s.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('sessions')
      .update({ feel, note: note.trim() || null })
      .eq('id', s.id)
    setSaving(false)
    if (error) {
      setError('Could not save. Please try again.')
      return
    }
    setExpanded(false)
    onUpdated?.()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Summary row — always visible */}
      <button
        className="w-full text-left p-4"
        onClick={() => !isReadOnly && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 text-sm">
                {s.distance_km != null ? formatDistance(s.distance_km * 1000) : '—'}
                {s.duration_seconds != null && (
                  <span className="text-gray-500"> · {formatDuration(s.duration_seconds)}</span>
                )}
              </span>
              {feel != null && (
                <span className="text-lg" aria-label={`Feel: ${FEEL_LABELS[feel]}`}>
                  {FEEL_EMOJI[feel]}
                </span>
              )}
              {feel == null && !isReadOnly && (
                <span className="text-xs text-gray-400 italic">Tap to rate</span>
              )}
              {s.sync_source === 'strava_webhook' && <StravaLogo />}
            </div>
            {note && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{note}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatDate(s.date)}
            </span>
            {!isReadOnly && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {/* Expanded panel — coaches only */}
      {expanded && !isReadOnly && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
          {/* Feel picker */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              How did this run feel?
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as Feel[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setFeel(v)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl text-2xl transition-all ${
                    feel === v
                      ? 'bg-teal-50 ring-2 ring-teal-400'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-label={FEEL_LABELS[v]}
                  aria-pressed={feel === v}
                >
                  {FEEL_EMOJI[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Session note <span className="font-normal normal-case">(optional)</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go? Any observations about this run…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setExpanded(false); setFeel(s.feel as Feel | null); setNote(s.note ?? '') }}
              className="text-sm text-gray-500 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunsTab({ sessions, milestones, isReadOnly = false, onSessionUpdated }: RunsTabProps) {
  const feedItems: FeedItem[] = [
    ...sessions.map((s) => ({ type: 'session' as const, sortKey: s.date, data: s })),
    ...milestones.map((m) => ({ type: 'milestone' as const, sortKey: m.achieved_at, data: m })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  if (feedItems.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12 text-sm">
        No runs yet. Sessions will appear here after runs are synced from Strava.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => {
        if (item.type === 'session') {
          return (
            <SessionCard
              key={`session-${item.data.id}`}
              session={item.data}
              isReadOnly={isReadOnly}
              onUpdated={onSessionUpdated}
            />
          )
        }
        const m = item.data
        return (
          <div key={`milestone-${m.id}`} className="bg-teal-50 border border-teal-200 rounded-xl p-4">
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
