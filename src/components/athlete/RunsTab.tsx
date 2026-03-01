'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, ChevronRight } from 'lucide-react'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import type { SessionData, MilestoneData, PhotoData } from './AthleteTabs'
import type { WeeklyVolume, FeelPoint, DistancePoint, MilestonePin } from '@/lib/analytics/session-trends'
import { updateManualSession, updateSessionFeel, deleteSession } from '@/app/athletes/[id]/actions'
import StravaActivityLink from '@/components/feed/StravaActivityLink'
import PhotoLightbox from './PhotoLightbox'

const ProgressChart = dynamic(() => import('@/components/charts/ProgressChart'), {
  loading: () => <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />,
  ssr: false,
})

type RunsTabProps = {
  sessions: SessionData[]
  milestones: MilestoneData[]
  photosBySession?: Record<string, PhotoData[]>
  weeklyData: { label: string; km: number; weekStart: string }[]
  weeklyVolume?: WeeklyVolume[]
  feelTrend?: FeelPoint[]
  distanceTimeline?: DistancePoint[]
  milestonePins?: MilestonePin[]
  athleteId: string
  athleteName: string
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

function StravaLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 inline-block ml-1" aria-label="Strava" fill="#FC4C02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

type SessionCardProps = {
  session: SessionData
  athleteId: string
  athleteName: string
  isReadOnly: boolean
  onUpdated?: () => void
  badges?: MilestoneData[]
  photos?: PhotoData[]
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

const FEEL_TEXT: Record<number, string> = {
  1: 'text-red-700',
  2: 'text-orange-700',
  3: 'text-yellow-700',
  4: 'text-green-700',
  5: 'text-teal-700',
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return ''
  const paceSecondsPerKm = durationSeconds / distanceKm
  const paceMinutes = Math.floor(paceSecondsPerKm / 60)
  const paceSeconds = Math.round(paceSecondsPerKm % 60)
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`
}

function SessionCard({ session: s, athleteId, athleteName, isReadOnly, onUpdated, badges = [], photos = [] }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feel, setFeel] = useState<Feel | null>(s.feel as Feel | null)
  const [note, setNote] = useState(s.note ?? '')
  const [date, setDate] = useState(s.date)
  const [distanceKm, setDistanceKm] = useState(s.distance_km != null ? String(s.distance_km) : '')
  const [durationMins, setDurationMins] = useState(s.duration_seconds != null ? String(Math.round(s.duration_seconds / 60)) : '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
      if (error) { setError(error); return }
    } else {
      const { error } = await updateSessionFeel(s.id, {
        feel,
        note: note.trim() || null,
      })
      setSaving(false)
      if (error) { setError(error); return }
    }
    setExpanded(false)
    onUpdated?.()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { error } = await deleteSession(s.id, athleteId)
    setDeleting(false)
    if (error) { setError(error); setConfirmingDelete(false); return }
    setDeleted(true)
    onUpdated?.()
  }

  if (deleted) return null

  const borderColor = feel ? FEEL_COLORS[feel] : 'border-l-gray-200'
  const pace = s.distance_km && s.duration_seconds
    ? formatPace(s.distance_km, s.duration_seconds)
    : null

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-[5px] ${borderColor} shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>
      <button
        className="w-full text-left"
        onClick={() => !isReadOnly && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="px-4 pt-4 pb-3">
          {/* Strava title — shown when present (e.g. race name) */}
          {s.strava_title && (
            <p className="text-xs font-semibold text-orange-600 mb-1.5 truncate">{s.strava_title}</p>
          )}
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FEEL_BG[feel]} ${FEEL_TEXT[feel]}`}>
                  {FEEL_EMOJI[feel]} {FEEL_LABELS[feel]}
                </span>
              )}
              {feel == null && !isReadOnly && (
                <span className="text-xs text-gray-400 italic">Rate run</span>
              )}
            </div>
          </div>

          {/* Stats row — pace + HR + date + strava */}
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            {pace && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {pace}
              </span>
            )}
            {s.avg_heart_rate != null && (
              <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {s.avg_heart_rate} bpm{s.max_heart_rate != null ? ` / ${s.max_heart_rate} max` : ''}
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

          {/* Session photos — clickable to open lightbox */}
          {photos.length > 0 && (
            <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="relative group focus:ring-2 focus:ring-teal-500 focus:outline-none rounded-lg overflow-hidden flex-shrink-0"
                  aria-label={`View photo ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.signed_url}
                    alt={photo.caption ?? 'Session photo'}
                    loading="lazy"
                    className="w-14 h-14 rounded-lg object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* Hover hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                </button>
              ))}
              {photos.length > 0 && (
                <span className="flex items-center text-[10px] text-gray-400 pl-1">
                  Tap to view
                </span>
              )}
            </div>
          )}

          {/* Milestone badges — unified amber style (matches feed page) */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {m.icon ?? '🏆'} {m.label}
                  {m.id && (
                    <a
                      href={`/milestone/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-amber-400 hover:text-amber-600"
                      onClick={e => e.stopPropagation()}
                      title="Share this milestone"
                    >
                      ↗
                    </a>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Footer — coach + strava link + chevron */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {s.coach_name && (
                <span className="text-xs text-gray-400">👟 {s.coach_name}</span>
              )}
              {s.strava_activity_id && (
                <span onClick={(e) => e.stopPropagation()}>
                  <StravaActivityLink activityId={s.strava_activity_id} />
                </span>
              )}
            </div>
            {!isReadOnly && (
              <ChevronRight
                size={16}
                className={`text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        </div>
      </button>

      {/* Expanded panel — coaches only */}
      {expanded && !isReadOnly && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/80 space-y-4">
          {s.sync_source === 'manual' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Date</p>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  onKeyDown={(e) => e.preventDefault()}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none w-full" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Distance (km)</p>
                <input type="number" step="0.01" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none w-full" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Duration (mins)</p>
                <input type="number" step="1" value={durationMins} onChange={(e) => setDurationMins(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none w-full" />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Rate this run <span className="font-normal normal-case">(1 = Very hard, 5 = Great)</span></p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as Feel[]).map((v) => (
                <button key={v} onClick={() => setFeel(v)}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all ${
                    feel === v ? 'bg-teal-50 ring-2 ring-teal-400 shadow-sm' : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-label={FEEL_LABELS[v]} aria-pressed={feel === v}>
                  <span className="text-2xl">{FEEL_EMOJI[v]}</span>
                  <span className="text-xs text-gray-400 mt-1">{FEEL_LABELS[v]}</span>
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            {!confirmingDelete && (
              <button onClick={() => setConfirmingDelete(true)} disabled={deleting || saving}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 px-3 py-2 transition-colors font-medium">
                Delete run
              </button>
            )}
            {confirmingDelete && (
              <div className="flex flex-col gap-1.5">
                {s.sync_source !== 'manual' && (
                  <p className="text-[11px] text-red-500 max-w-[260px]">
                    This run was synced from Strava. Deleting it here won&apos;t affect Strava, but re-syncing this activity may not be possible.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Delete this run?</span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors">
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmingDelete(false)} disabled={deleting}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setExpanded(false); setFeel(s.feel as Feel | null); setNote(s.note ?? ''); setDate(s.date); setDistanceKm(s.distance_km != null ? String(s.distance_km) : ''); setDurationMins(s.duration_seconds != null ? String(Math.round(s.duration_seconds / 60)) : '') }}
                className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors shadow-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          athleteName={athleteName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}

export default function RunsTab({ sessions, milestones, photosBySession, weeklyData, weeklyVolume, feelTrend, distanceTimeline, milestonePins, athleteId, athleteName, isReadOnly = false, onSessionUpdated, onLogRun }: RunsTabProps) {
  const milestonesBySession: Record<string, MilestoneData[]> = {}
  for (const m of milestones) {
    if (!m.session_id) continue
    if (!milestonesBySession[m.session_id]) milestonesBySession[m.session_id] = []
    milestonesBySession[m.session_id].push(m)
  }

  const feedItems: FeedItem[] = sessions
    .filter((s) => s.date != null && s.date !== '')
    .map((s) => ({ type: 'session' as const, sortKey: s.date, data: s }))
    .sort((a, b) => (b.sortKey ?? '').localeCompare(a.sortKey ?? ''))

  return (
    <div className="space-y-3">
      {/* Log run button — coaches only */}
      {!isReadOnly && (
        <button
          onClick={onLogRun}
          className="w-full flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 hover:text-teal-800 rounded-xl py-3.5 text-sm font-semibold transition-colors"
        >
          <Plus size={18} strokeWidth={2.5} />
          Log a run
        </button>
      )}

      {/* Progress charts — visible to everyone, min 2 weeks of data */}
      {weeklyVolume && feelTrend && distanceTimeline && weeklyVolume.some(w => w.totalKm > 0) && (
        <ProgressChart
          weeklyVolume={weeklyVolume}
          feelTrend={feelTrend}
          distanceTimeline={distanceTimeline}
          milestonePins={milestonePins}
        />
      )}

      {feedItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-sm font-semibold text-gray-900 mb-1">Ready for the first run?</p>
          <p className="text-xs text-gray-500">Sessions will appear here once logged or synced from Strava.</p>
        </div>
      )}
      {feedItems.map((item) => (
        <SessionCard
          key={`session-${item.data.id}`}
          session={item.data}
          athleteId={athleteId}
          athleteName={athleteName}
          isReadOnly={isReadOnly}
          onUpdated={onSessionUpdated}
          badges={milestonesBySession[item.data.id] ?? []}
          photos={photosBySession?.[item.data.id] ?? []}
        />
      ))}
    </div>
  )
}
