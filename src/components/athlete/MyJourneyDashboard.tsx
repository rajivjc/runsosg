'use client'

import { useState, useCallback } from 'react'
import { sendAthleteMessage } from '@/app/my/[athleteId]/actions'

// ─── Types ──────────────────────────────────────────────────────

interface AthleteData {
  id: string
  name: string
  photo_url: string | null
}

interface StatData {
  totalRuns: number
  totalKm: number
  currentStreak: number
}

interface MilestoneData {
  id: string
  label: string
  icon: string
  achieved_at: string
}

interface GoalData {
  label: string
  current: number
  target: number
  pct: number
  unit: string
}

interface RecentRun {
  id: string
  date: string
  distance_km: number | null
  feel: number | null
}

interface CheerData {
  id: string
  message: string
  created_at: string
}

interface Props {
  athlete: AthleteData
  stats: StatData
  milestones: MilestoneData[]
  goal: GoalData | null
  recentRuns: RecentRun[]
  cheers: CheerData[]
  storyUrl: string | null
}

// ─── Feel emoji mapping ─────────────────────────────────────────

const FEEL_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😢', label: 'Tough' },
  2: { emoji: '😐', label: 'Okay' },
  3: { emoji: '🙂', label: 'Good' },
  4: { emoji: '😄', label: 'Great' },
  5: { emoji: '🤩', label: 'Amazing' },
}

// ─── Preset messages ────────────────────────────────────────────

const PRESET_MESSAGES = [
  'Thank you!',
  'That was fun!',
  'I want to run more!',
  'See you next week!',
]

// ─── Component ──────────────────────────────────────────────────

export default function MyJourneyDashboard({
  athlete,
  stats,
  milestones,
  goal,
  recentRuns,
  cheers,
  storyUrl,
}: Props) {
  const [messageSent, setMessageSent] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)

  const handleSendMessage = useCallback(async (message: string) => {
    setSendingMessage(true)
    setMessageError(null)
    const result = await sendAthleteMessage(athlete.id, message)
    setSendingMessage(false)

    if (result.success) {
      setMessageSent(message)
      setTimeout(() => setMessageSent(null), 4000)
    } else {
      setMessageError(result.error ?? 'Could not send. Try again.')
    }
  }, [athlete.id])

  const formatRunDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Singapore',
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 to-white pb-12">
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* ── Hero Section ─────────────────────────────────── */}
        <section className="text-center mb-8">
          {athlete.photo_url ? (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-teal-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={athlete.photo_url}
                alt={`${athlete.name}'s photo`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center border-4 border-teal-200">
              <span className="text-4xl">🏃</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Hi {athlete.name}!
          </h1>
          <p className="text-lg text-teal-700">
            Great to see you!
          </p>
        </section>

        {/* ── Stats Strip ──────────────────────────────────── */}
        <section aria-label="Your running stats" className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            icon="🏃"
            value={stats.totalRuns}
            label="runs"
            maxValue={Math.max(stats.totalRuns, 20)}
          />
          <StatCard
            icon="📏"
            value={Number(stats.totalKm.toFixed(1))}
            label="km"
            maxValue={Math.max(stats.totalKm, 10)}
          />
          <StatCard
            icon="🔥"
            value={stats.currentStreak}
            label={stats.currentStreak === 1 ? 'week' : 'weeks'}
            maxValue={Math.max(stats.currentStreak, 4)}
          />
        </section>

        {/* ── Milestones Wall ──────────────────────────────── */}
        {milestones.length > 0 && (
          <section aria-label="Your milestones" className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🏆</span> Your milestones
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {milestones.map(m => (
                <div
                  key={m.id}
                  className="bg-white border-2 border-amber-100 rounded-xl px-4 py-4 text-center shadow-sm"
                >
                  <span className="text-4xl block mb-2">{m.icon || '🏆'}</span>
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Goal Progress ───────────────────────────────── */}
        {goal && (
          <section aria-label="Your goal" className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🎯</span> Your goal
            </h2>
            <div className="bg-white border border-teal-100 rounded-xl px-5 py-4 shadow-sm">
              <p className="text-base font-semibold text-gray-900 mb-2">
                {goal.label}
              </p>
              {/* Visual progress bar */}
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(goal.pct, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={goal.current}
                  aria-valuemin={0}
                  aria-valuemax={goal.target}
                  aria-label={`${goal.current} of ${goal.target} ${goal.unit}`}
                />
              </div>
              {/* Text alongside visual */}
              <p className="text-sm text-teal-700">
                {goal.current} of {goal.target} {goal.unit} done. {Math.max(0, goal.target - goal.current)} more to go!
              </p>
            </div>
          </section>
        )}

        {/* ── Recent Runs ─────────────────────────────────── */}
        {recentRuns.length > 0 && (
          <section aria-label="Your recent runs" className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>📅</span> Recent runs
            </h2>
            <div className="space-y-2">
              {recentRuns.map(run => {
                const feel = run.feel ? FEEL_LABELS[run.feel] : null
                const km = run.distance_km ?? 0
                return (
                  <div
                    key={run.id}
                    className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm"
                  >
                    {feel && (
                      <span className="text-2xl flex-shrink-0" title={feel.label}>
                        {feel.emoji}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatRunDate(run.date)}
                      </p>
                      {/* Visual distance bar alongside number */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-400 rounded-full"
                            style={{ width: `${Math.min((km / 5) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 w-12 text-right">
                          {km.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Cheers from Home ────────────────────────────── */}
        {cheers.length > 0 && (
          <section aria-label="Messages from home" className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>💬</span> Messages from home
            </h2>
            <div className="space-y-2">
              {cheers.map(c => (
                <div
                  key={c.id}
                  className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 shadow-sm"
                >
                  <p className="text-base text-amber-900">
                    &ldquo;{c.message}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Send Message to Coach ───────────────────────── */}
        <section aria-label="Send a message to your coach" className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>✉️</span> Send a message to your coach
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {PRESET_MESSAGES.map(msg => (
              <button
                key={msg}
                onClick={() => handleSendMessage(msg)}
                disabled={sendingMessage}
                className="h-14 bg-white border-2 border-teal-200 hover:border-teal-400 hover:bg-teal-50
                           disabled:opacity-40 text-teal-800 text-base font-medium rounded-xl
                           transition-colors shadow-sm"
              >
                {msg}
              </button>
            ))}
          </div>
          {/* Feedback */}
          <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
            {messageSent && (
              <p className="text-base text-teal-700 font-medium text-center">
                Message sent! Your coach will see it.
              </p>
            )}
            {messageError && (
              <p className="text-base text-red-600 font-medium text-center">
                {messageError}
              </p>
            )}
          </div>
        </section>

        {/* ── Share Button ────────────────────────────────── */}
        {storyUrl && (
          <section className="text-center">
            <a
              href={storyUrl}
              className="inline-flex items-center gap-2 h-14 px-8 bg-teal-600 hover:bg-teal-700
                         text-white text-lg font-semibold rounded-xl transition-colors shadow-sm"
            >
              <span>🔗</span> Share my running story
            </a>
          </section>
        )}
      </div>
    </main>
  )
}

// ─── Stat Card Sub-Component ────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  maxValue,
}: {
  icon: string
  value: number
  label: string
  maxValue: number
}) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0
  return (
    <div className="bg-white border border-teal-100 rounded-xl px-3 py-4 text-center shadow-sm">
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      {/* Visual bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-400 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
