// Refactored from 849-line monolith. Children:
// - MoodCheckIn: mood selection + submission
// - AvatarPicker: avatar selection + display (when no photo)
// - ThemeColorPicker: theme colour selection + save
// Parent manages: selectedColor/theme (shared across all sections),
//   message state, favorites, goal choice, athlete data, and all
//   non-personalization sections.

'use client'

import { useState, useCallback } from 'react'
import { sendAthleteMessage, toggleFavoriteRun, setAthleteGoal } from '@/app/my/[athleteId]/actions'
import MoodCheckIn from '@/components/athlete/MoodCheckIn'
import AvatarPicker from '@/components/athlete/AvatarPicker'
import ThemeColorPicker from '@/components/athlete/ThemeColorPicker'

// ─── Types ──────────────────────────────────────────────────────

interface AthleteData {
  id: string
  name: string
  photo_url: string | null
  avatar: string | null
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

interface PersonalBestData {
  distance_km: number
  date: string
}

interface PrimaryCoachData {
  name: string
  sessionCount: number
}

interface Props {
  athlete: AthleteData
  stats: StatData
  milestones: MilestoneData[]
  goal: GoalData | null
  personalBest: PersonalBestData | null
  bestRuns: RecentRun[]
  recentRuns: RecentRun[]
  cheers: CheerData[]
  storyUrl: string | null
  athleteGoalChoice: string | null
  themeColor: string
  currentMood: number | null
  favoriteSessionIds: string[]
  primaryCoach: PrimaryCoachData | null
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

// ─── Theme color mapping ────────────────────────────────────────

const THEME_COLORS: Record<string, {
  from: string; ring: string; bg: string
  border: string; borderLight: string; text: string; bgLight: string; bgDark: string
}> = {
  teal:   { from: 'from-teal-50 dark:from-teal-950/30',   ring: 'ring-teal-400',   bg: 'bg-teal-400',   border: 'border-teal-400',   borderLight: 'border-teal-200 dark:border-teal-400/20', text: 'text-teal-700 dark:text-teal-300',   bgLight: 'bg-teal-50 dark:bg-teal-900/20',   bgDark: 'bg-teal-600' },
  blue:   { from: 'from-blue-50 dark:from-blue-950/30',   ring: 'ring-blue-400',   bg: 'bg-blue-400',   border: 'border-blue-400',   borderLight: 'border-blue-200 dark:border-blue-400/20', text: 'text-blue-700 dark:text-blue-300',   bgLight: 'bg-blue-50 dark:bg-blue-900/15',   bgDark: 'bg-blue-600' },
  purple: { from: 'from-purple-50 dark:from-purple-950/30', ring: 'ring-purple-400', bg: 'bg-purple-400', border: 'border-purple-400', borderLight: 'border-purple-200 dark:border-purple-400/20', text: 'text-purple-700 dark:text-purple-300', bgLight: 'bg-purple-50 dark:bg-purple-900/15', bgDark: 'bg-purple-600' },
  green:  { from: 'from-green-50 dark:from-green-950/30',  ring: 'ring-green-400',  bg: 'bg-green-400',  border: 'border-green-400',  borderLight: 'border-green-200 dark:border-green-400/20', text: 'text-green-700 dark:text-green-300',  bgLight: 'bg-green-50 dark:bg-green-900/20',  bgDark: 'bg-green-600' },
  amber:  { from: 'from-amber-50 dark:from-amber-950/30',  ring: 'ring-amber-400',  bg: 'bg-amber-400',  border: 'border-amber-400',  borderLight: 'border-amber-200 dark:border-amber-400/20', text: 'text-amber-700 dark:text-amber-300',  bgLight: 'bg-amber-50 dark:bg-amber-900/20',  bgDark: 'bg-amber-600' },
  coral:  { from: 'from-orange-50 dark:from-orange-950/30', ring: 'ring-orange-400', bg: 'bg-orange-400', border: 'border-orange-400', borderLight: 'border-orange-200 dark:border-orange-400/20', text: 'text-orange-700 dark:text-orange-300', bgLight: 'bg-orange-50 dark:bg-orange-900/20', bgDark: 'bg-orange-600' },
}

// ─── Goal choice labels ─────────────────────────────────────────

const GOAL_CHOICES = [
  { key: 'run_further', icon: '📏', label: 'Run further', desc: 'Try to run a longer distance each time' },
  { key: 'run_more', icon: '🔄', label: 'Run more often', desc: 'Try to run every week' },
  { key: 'feel_stronger', icon: '💪', label: 'Feel stronger', desc: 'Focus on feeling good when you run' },
]

export default function MyJourneyDashboard({
  athlete,
  stats,
  milestones,
  goal,
  personalBest,
  bestRuns,
  recentRuns,
  cheers,
  storyUrl,
  athleteGoalChoice,
  themeColor,
  currentMood,
  favoriteSessionIds,
  primaryCoach,
}: Props) {
  const [messageSent, setMessageSent] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set(favoriteSessionIds))
  const [goalChoice, setGoalChoice] = useState<string | null>(athleteGoalChoice)
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(themeColor)
  const [lastSentMessage, setLastSentMessage] = useState<{ message: string; time: string } | null>(null)
  const theme = THEME_COLORS[selectedColor] ?? THEME_COLORS.teal

  const handleSendMessage = useCallback(async (message: string) => {
    setSendingMessage(true)
    setMessageError(null)
    const result = await sendAthleteMessage(athlete.id, message)
    setSendingMessage(false)

    if (result.success) {
      setMessageSent(message)
      setTimeout(() => setMessageSent(null), 4000)
      const now = new Date()
      const timeStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      setLastSentMessage({ message, time: timeStr })
    } else {
      setMessageError(result.error ?? 'Could not send. Try again.')
    }
  }, [athlete.id])

  const handleFavorite = useCallback(async (sessionId: string) => {
    const wasFav = favorites.has(sessionId)
    const next = new Set(favorites)
    if (wasFav) next.delete(sessionId); else next.add(sessionId)
    setFavorites(next)
    await toggleFavoriteRun(athlete.id, sessionId)
  }, [athlete.id, favorites])

  const handleGoalChoice = useCallback(async (choice: string) => {
    setGoalChoice(choice)
    setGoalFeedback(null)
    const result = await setAthleteGoal(athlete.id, choice)
    if (result.success) {
      setGoalFeedback('Goal updated!')
      setTimeout(() => setGoalFeedback(null), 3000)
    }
  }, [athlete.id])

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
  }, [])

  const formatRunDate = (dateStr: string) => {
    // dateStr may be a full ISO timestamp (timestamptz) or YYYY-MM-DD
    const date = dateStr.includes('T')
      ? new Date(dateStr)
      : new Date(dateStr + 'T12:00:00+08:00')
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Singapore',
    })
  }

  return (
    <main className={`min-h-screen bg-gradient-to-b ${theme.from} to-white dark:to-[#141424] pb-12`}>
      <div className="max-w-lg mx-auto px-5 py-8">

        {/* ── Hero Section ─────────────────────────────────── */}
        <section className="text-center mb-8">
          {athlete.photo_url ? (
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 ${theme.borderLight}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={athlete.photo_url}
                alt={`${athlete.name}'s photo`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <AvatarPicker
              athleteId={athlete.id}
              currentAvatar={athlete.avatar}
              themeRing={theme.ring}
              themeText={theme.text}
              themeBgLight={theme.bgLight}
              themeBorderLight={theme.borderLight}
            />
          )}

          <h1 className="text-2xl font-bold text-text-primary mb-1">
            Hi {athlete.name}!
          </h1>
          <p className={`text-lg ${theme.text}`}>
            Great to see you!
          </p>
        </section>

        {/* ── Mood Picker ─────────────────────────────────── */}
        <MoodCheckIn
          athleteId={athlete.id}
          currentMood={currentMood}
          themeRing={theme.ring}
          themeText={theme.text}
        />

        {/* ── Your Coach ──────────────────────────────────── */}
        {primaryCoach && (
          <section aria-label="Your coach" className="mb-8">
            <div className={`${theme.bgLight} border ${theme.borderLight} rounded-xl px-5 py-4 text-center shadow-sm`}>
              <p className="text-base font-medium text-text-primary mb-0.5">
                Your coach
              </p>
              <p className="text-lg font-bold text-text-primary mb-1">
                {primaryCoach.name}
              </p>
              <p className="text-sm text-text-muted mb-3">
                {primaryCoach.sessionCount} {primaryCoach.sessionCount === 1 ? 'session' : 'sessions'} together
              </p>
              {primaryCoach.sessionCount <= 20 ? (
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {Array.from({ length: Math.min(primaryCoach.sessionCount, 20) }).map((_, i) => (
                    <span key={i} className={`inline-block w-3 h-3 rounded-full ${theme.bg}`} />
                  ))}
                  {(() => {
                    // Show empty dots to next milestone
                    const milestoneTargets = [5, 15, 25]
                    const nextTarget = milestoneTargets.find(t => t > primaryCoach.sessionCount) ?? primaryCoach.sessionCount
                    const empty = nextTarget - primaryCoach.sessionCount
                    return Array.from({ length: Math.min(empty, 20 - primaryCoach.sessionCount) }).map((_, i) => (
                      <span key={`e${i}`} className="inline-block w-3 h-3 rounded-full bg-surface-alt" />
                    ))
                  })()}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* ── Stats Strip ──────────────────────────────────── */}
        <section aria-label="Your running stats" className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            icon="🏃"
            value={stats.totalRuns}
            label="runs"
            maxValue={Math.max(stats.totalRuns, 20)}
            barColor={theme.bg}
            borderColor={theme.borderLight}
          />
          <StatCard
            icon="📏"
            value={Number(stats.totalKm.toFixed(1))}
            label="km"
            maxValue={Math.max(stats.totalKm, 10)}
            barColor={theme.bg}
            borderColor={theme.borderLight}
          />
          <StreakVisual weeks={stats.currentStreak} themeBarColor={theme.bg} themeBorderLight={theme.borderLight} />
        </section>

        {/* ── Personal Best ─────────────────────────────────── */}
        {personalBest && (
          <section aria-label="Your personal best" className="mb-8">
            <div className="bg-surface border-l-4 border-amber-400 rounded-xl px-5 py-4 shadow-sm flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-text-primary">
                  Your longest run: {personalBest.distance_km.toFixed(1)} km
                </p>
                <p className="text-sm text-text-muted">
                  on {formatRunDate(personalBest.date)}
                </p>
                {/* Visual distance bar */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2.5 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min((personalBest.distance_km / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── My Best Runs ──────────────────────────────────── */}
        {bestRuns.length > 0 && (
          <section aria-label="My best runs" className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>⭐</span> My best runs
            </h2>
            <div className="space-y-2">
              {bestRuns.map(run => {
                const feel = run.feel ? FEEL_LABELS[run.feel] : null
                const km = run.distance_km ?? 0
                return (
                  <div
                    key={run.id}
                    className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-400/20 border-l-4 border-l-amber-400 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm"
                  >
                    {feel && (
                      <div className="flex flex-col items-center flex-shrink-0 w-10">
                        <span className="text-2xl">{feel.emoji}</span>
                        <span className="text-[10px] text-text-muted mt-0.5">{feel.label}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {formatRunDate(run.date)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {km > 0 ? (
                          <>
                            <div className="flex-1 h-2 bg-amber-100 dark:bg-amber-900/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${Math.min((km / 5) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted flex-shrink-0 w-12 text-right">
                              {km.toFixed(1)} km
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-text-hint">
                            No distance recorded
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xl" aria-label="Favourited">❤️</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Milestones Wall ──────────────────────────────── */}
        {milestones.length > 0 && (
          <section aria-label="Your milestones" className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>🏆</span> Your milestones
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {milestones.map(m => (
                <div
                  key={m.id}
                  className="bg-surface border-2 border-amber-100 dark:border-amber-400/20 rounded-xl px-4 py-4 text-center shadow-sm"
                >
                  <span className="text-4xl block mb-2">{m.icon || '🏆'}</span>
                  <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Athlete Goal Choice ─────────────────────────── */}
        <section aria-label="Your focus" className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>🎯</span> What do you want to work on?
          </h2>
          <div className="space-y-2">
            {GOAL_CHOICES.map(g => {
              const selected = goalChoice === g.key
              return (
                <button
                  key={g.key}
                  onClick={() => handleGoalChoice(g.key)}
                  className={`w-full text-left flex items-center gap-4 rounded-xl px-5 py-4 transition-all shadow-sm
                    ${selected
                      ? `${theme.bgLight} border-2 ${theme.border} ring-1 ${theme.ring}`
                      : `bg-surface border-2 border-border-subtle hover:${theme.borderLight} opacity-70`
                    }`}
                >
                  <span className="text-2xl flex-shrink-0">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-text-primary flex items-center gap-2">
                      {g.label}
                      {selected && <span className={theme.text}>✓</span>}
                    </p>
                    <p className="text-sm text-text-muted">{g.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
            {goalFeedback && (
              <p className={`text-sm ${theme.text} font-medium text-center`}>{goalFeedback}</p>
            )}
          </div>
        </section>

        {/* ── Goal Progress ───────────────────────────────── */}
        {goal && (
          <section aria-label="Your goal" className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>🎯</span> Your goal
            </h2>
            <div className={`bg-surface border ${theme.borderLight} rounded-xl px-5 py-4 shadow-sm`}>
              <p className="text-base font-semibold text-text-primary mb-2">
                {goal.label}
              </p>
              {/* Visual progress bar */}
              <div className="w-full h-4 bg-surface-alt rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(goal.pct, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={goal.current}
                  aria-valuemin={0}
                  aria-valuemax={goal.target}
                  aria-label={`${goal.current} of ${goal.target} ${goal.unit}`}
                />
              </div>
              {/* Text alongside visual */}
              <p className={`text-sm ${theme.text}`}>
                {goal.current} of {goal.target} {goal.unit} done. {Math.max(0, goal.target - goal.current)} more to go!
              </p>
            </div>
          </section>
        )}

        {/* ── Recent Runs ─────────────────────────────────── */}
        {recentRuns.length > 0 && (
          <section aria-label="Your recent runs" className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>📅</span> Recent runs
            </h2>
            <div className="space-y-2">
              {recentRuns.map(run => {
                const feel = run.feel ? FEEL_LABELS[run.feel] : null
                const km = run.distance_km ?? 0
                return (
                  <div
                    key={run.id}
                    className={`bg-surface border border-border-subtle border-l-4 ${theme.border} rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm`}
                  >
                    {feel && (
                      <div className="flex flex-col items-center flex-shrink-0 w-10">
                        <span className="text-2xl">{feel.emoji}</span>
                        <span className="text-[10px] text-text-muted mt-0.5">{feel.label}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {formatRunDate(run.date)}
                      </p>
                      {/* Visual distance bar alongside number */}
                      <div className="flex items-center gap-2 mt-1">
                        {km > 0 ? (
                          <>
                            <div className="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
                              <div
                                className={`h-full ${theme.bg} rounded-full`}
                                style={{ width: `${Math.min((km / 5) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted flex-shrink-0 w-12 text-right">
                              {km.toFixed(1)} km
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-text-hint">
                            No distance recorded
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Heart favorite toggle */}
                    <button
                      onClick={() => handleFavorite(run.id)}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-red-50 dark:hover:bg-red-900/15"
                      aria-label={favorites.has(run.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <span className="text-xl">
                        {favorites.has(run.id) ? '❤️' : '🤍'}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Cheers from Home ────────────────────────────── */}
        {cheers.length > 0 && (
          <section aria-label="Messages from home" className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <span>💬</span> Messages from home
            </h2>
            <div className="space-y-2">
              {cheers.map(c => (
                <div
                  key={c.id}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-400/20 rounded-xl px-4 py-3 shadow-sm"
                >
                  <p className="text-base text-amber-900">
                    &ldquo;{c.message}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Theme Color Picker ─────────────────────────── */}
        <ThemeColorPicker
          athleteId={athlete.id}
          selectedColor={selectedColor}
          themeText={theme.text}
          onColorChange={handleColorChange}
        />

        {/* ── Send Message to Coach ───────────────────────── */}
        <section aria-label="Send a message to your coach" className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>✉️</span> Send a message to your coach
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {PRESET_MESSAGES.map(msg => (
              <button
                key={msg}
                onClick={() => handleSendMessage(msg)}
                disabled={sendingMessage}
                className={`h-14 bg-surface border-2 ${theme.borderLight} hover:${theme.border} hover:${theme.bgLight}
                           disabled:opacity-40 ${theme.text} text-base font-medium rounded-xl
                           transition-colors shadow-sm`}
              >
                {msg}
              </button>
            ))}
          </div>
          {/* Feedback */}
          <div aria-live="polite" className="mt-3 min-h-[1.5rem]">
            {messageSent && (
              <p className={`text-base ${theme.text} font-medium text-center`}>
                Message sent! Your coach will see it.
              </p>
            )}
            {messageError && (
              <p className="text-base text-red-600 dark:text-red-300 font-medium text-center">
                {messageError}
              </p>
            )}
          </div>
          {lastSentMessage && !messageSent && (
            <p className="text-sm text-text-muted text-center mt-2">
              You sent &ldquo;{lastSentMessage.message}&rdquo; on {lastSentMessage.time} ✓
            </p>
          )}
        </section>

        {/* ── Share Button ────────────────────────────────── */}
        {storyUrl && (
          <section className="text-center">
            <a
              href={storyUrl}
              className={`inline-flex items-center gap-2 h-14 px-8 ${theme.bgDark} hover:opacity-90
                         text-white text-lg font-semibold rounded-xl transition-colors shadow-sm`}
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
  barColor,
  borderColor,
}: {
  icon: string
  value: number
  label: string
  maxValue: number
  barColor: string
  borderColor: string
}) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0
  return (
    <div className={`bg-surface border ${borderColor} rounded-xl px-3 py-4 text-center shadow-sm`}>
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mb-2">{label}</p>
      {/* Visual bar */}
      <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Streak Visual Sub-Component ────────────────────────────────

function StreakVisual({ weeks, themeBarColor, themeBorderLight }: { weeks: number; themeBarColor: string; themeBorderLight: string }) {
  // Build stacked shoe icons (max 5 visible)
  const shoeCount = Math.min(weeks, 5)
  const isGold = weeks >= 3
  const borderColor = isGold ? 'border-amber-200 dark:border-amber-400/20' : themeBorderLight
  const glowClass = weeks >= 5 ? 'ring-2 ring-amber-200' : ''

  return (
    <div className={`bg-surface border ${borderColor} ${glowClass} rounded-xl px-3 py-4 text-center shadow-sm`}>
      <div className="flex justify-center items-end gap-0.5 mb-1 h-8">
        {weeks === 0 ? (
          <span className="text-2xl opacity-30">👟</span>
        ) : (
          Array.from({ length: shoeCount }).map((_, i) => (
            <span
              key={i}
              className={`text-lg leading-none ${isGold ? 'drop-shadow-sm' : ''}`}
              style={{ marginBottom: `${i * 2}px` }}
            >
              👟
            </span>
          ))
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{weeks}</p>
      <p className="text-sm text-text-secondary mb-2">
        {weeks === 0 ? 'No streak yet' : weeks === 1 ? 'week' : 'weeks'}
      </p>
      {weeks > 0 && (
        <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isGold ? 'bg-amber-400' : themeBarColor}`}
            style={{ width: `${Math.min((weeks / 8) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
