'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import type { SessionData, MilestoneData } from './AthleteTabs'
import { updateManualSession } from '@/app/athletes/[id]/actions'

type RunsTabProps = {
  sessions: SessionData[]
  milestones: MilestoneData[]
  isReadOnly?: boolean
  onSessionUpdated?: () => void
  onLogRun?: () => void
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

const FEEL_COLORS: Record<number, string> = {
  1: 'border-l-red-400',
  2: 'border-l-orange-400',
  3: 'border-l-yellow-400',
  4: 'border-l-green-400',
  5: 'border-l-teal-500',
}

const FEEL_BG: Record<number, string> = {
  1: 'bg-red-50',
  2: 'bg-orange-50',
  3: 'bg-yellow-50',
  4: 'bg-green-50',
  5: 'bg-teal-50',
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return ''
  const paceSecondsPerKm = durationSeconds / distanceKm
  const paceMinutes = Math.floor(paceSecondsPerKm / 60)
  const paceSeconds = Math.round(paceSecondsPerKm % 60)
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`
}

function SessionCard({ session: s, isReadOnly, onUpdated }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feel, setFeel] = useState<Feel | null>(s.feel as Feel | null)
  const [note, setNote] = useState(s.note ?? '')
  const [date, setDate] = useState(s.date)
  const [distanceKm, setDistanceKm] = useState(s.distance_km != null ? String(s.distance_km) : '')
  const [durationMins, setDurationMins] = useState(s.duration_seconds != null ? String(Math.round(s.duration_seconds / 60)) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    setError(null)
    if (s.sync_source === 'manual') {
      const parsedDistance = parseFloat(distanceKm)
      const parsedDuration = parseInt(durationMins)
      const { error } = await updateManualSession(s.id, {
        date,
        distance_km: isNaN(parsedDistance) ? null : parsedDistance,
        duration_seconds: isNaN(parsedDuration) ? null : parsedDuration * 60,
        feel,
        note: note.trim() || null,
      })
      setSaving(false)
      if (error) { setError('Could not save. Please try again.'); return }
    } else {
      const { error } = await supabase
        .from('sessions')
        .update({ feel, note: note.trim() || null })
        .eq('id', s.id)
      setSaving(false)
      if (error) { setError('Could not save. Please try again.'); return }
    }
    setExpanded(false)
    onUpdated?.()
  }

  const borderColor = feel ? FEEL_COLORS[feel] : 'border-l-gray-200'
  const pace = s.distance_km && s.duration_seconds
    ? formatPace(s.distance_km, s.duration_seconds)
    : null

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
      <button
        className="w-full text-left"
        onClick={() => !isReadOnly && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="px-4 pt-4 pb-3">
          {/* Top row — distance hero + feel + date */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 leading-none">
                {s.distance_km != null ? formatDistance(s.distance_km * 1000) : '—'}
              </span>
              {s.duration_seconds != null && (
                <span className="text-sm text-gray-500 font-medium">
                  {formatDuration(s.duration_seconds)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {feel != null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FEEL_BG[feel]} ${
                  feel === 1 ? 'text-red-700' :
                  feel === 2 ? 'text-orange-700' :
                  feel === 3 ? 'text-yellow-700' :
                  feel === 4 ? 'text-green-700' : 'text-teal-700'
                }`}>
                  {FEEL_EMOJI[feel]} {FEEL_LABELS[feel]}
                </span>
              )}
              {feel == null && !isReadOnly && (
                <span className="text-xs text-gray-400 italic">Rate run</span>
              )}
            </div>
          </div>

          {/* Stats row — pace + date + strava */}
          <div className="flex items-center gap-3 mb-1">
            {pace && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {pace}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(s.date)}</span>
            {s.sync_source === 'strava_webhook' && (
              <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                <StravaLogo /> Strava
              </span>
            )}
            {s.sync_source === 'manual' && (
              <span className="text-xs text-gray-400 font-medium">Manual</span>
            )}
          </div>

          {/* Note */}
          {note && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2 italic">&ldquo;{note}&rdquo;</p>
          )}

          {/* Footer — coach + strava link + chevron */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {s.coach_name && (
                <span className="text-xs text-gray-400">👟 {s.coach_name}</span>
              )}
              {s.strava_activity_id && (
                <a href={`https://www.strava.com/activities/${s.strava_activity_id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                  onClick={(e) => e.stopPropagation()}>
                  View on Strava ↗
                </a>
              )}
            </div>
            {!isReadOnly && (
              <svg xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </button>

      {/* Expanded panel — coaches only */}
      {expanded && !isReadOnly && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
          {s.sync_source === 'manual' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Date</p>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none w-full" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Distance (km)</p>
                <input type="number" step="0.01" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none w-full" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Duration (mins)</p>
                <input type="number" step="1" value={durationMins} onChange={(e) => setDurationMins(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none w-full" />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">How did this run feel?</p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as Feel[]).map((v) => (
                <button key={v} onClick={() => setFeel(v)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl text-2xl transition-all ${
                    feel === v ? 'bg-teal-50 ring-2 ring-teal-400' : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-label={FEEL_LABELS[v]} aria-pressed={feel === v}>
                  {FEEL_EMOJI[v]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Session note <span className="font-normal normal-case">(optional)</span>
            </p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go? Any observations about this run…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setExpanded(false); setFeel(s.feel as Feel | null); setNote(s.note ?? ''); setDate(s.date); setDistanceKm(s.distance_km != null ? String(s.distance_km) : ''); setDurationMins(s.duration_seconds != null ? String(Math.round(s.duration_seconds / 60)) : '') }}
              className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RunsTab({ sessions, milestones, isReadOnly = false, onSessionUpdated, onLogRun }: RunsTabProps) {
  const feedItems: FeedItem[] = [
    ...sessions.map((s) => ({ type: 'session' as const, sortKey: s.date, data: s })),
    ...milestones.map((m) => ({ type: 'milestone' as const, sortKey: m.achieved_at, data: m })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  return (
    <div className="space-y-3">
      {/* Log run button — coaches only */}
      {!isReadOnly && (
        <button
          onClick={onLogRun}
          className="w-full border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-gray-400 hover:text-teal-600 rounded-xl py-3 text-sm font-medium transition-colors"
        >
          + Log a run manually
        </button>
      )}

      {feedItems.length === 0 && (
        <p className="text-center text-gray-500 py-8 text-sm">
          No runs yet. Sessions will appear here after runs are synced from Strava.
        </p>
      )}
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
          <div key={`milestone-${m.id}`} className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-100 rounded-lg">
            <span className="text-lg">{m.icon ?? '🏆'}</span>
            <div>
              <p className="text-xs font-semibold text-teal-700">{m.label}</p>
              <p className="text-xs text-teal-500">{formatDate(m.achieved_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
