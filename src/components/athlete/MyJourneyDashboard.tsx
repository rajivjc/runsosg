'use client'

import { useState, useCallback } from 'react'
import { sendAthleteMessage, saveAthleteMood, toggleFavoriteRun, setAthleteGoal, setAthleteTheme } from '@/app/my/[athleteId]/actions'

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

interface PersonalBestData {
  distance_km: number
  date: string
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
  teal:   { from: 'from-teal-50',   ring: 'ring-teal-400',   bg: 'bg-teal-400',   border: 'border-teal-400',   borderLight: 'border-teal-200', text: 'text-teal-700',   bgLight: 'bg-teal-50',   bgDark: 'bg-teal-600' },
  blue:   { from: 'from-blue-50',   ring: 'ring-blue-400',   bg: 'bg-blue-400',   border: 'border-blue-400',   borderLight: 'border-blue-200', text: 'text-blue-700',   bgLight: 'bg-blue-50',   bgDark: 'bg-blue-600' },
  purple: { from: 'from-purple-50', ring: 'ring-purple-400', bg: 'bg-purple-400', border: 'border-purple-400', borderLight: 'border-purple-200', text: 'text-purple-700', bgLight: 'bg-purple-50', bgDark: 'bg-purple-600' },
  green:  { from: 'from-green-50',  ring: 'ring-green-400',  bg: 'bg-green-400',  border: 'border-green-400',  borderLight: 'border-green-200', text: 'text-green-700',  bgLight: 'bg-green-50',  bgDark: 'bg-green-600' },
  amber:  { from: 'from-amber-50',  ring: 'ring-amber-400',  bg: 'bg-amber-400',  border: 'border-amber-400',  borderLight: 'border-amber-200', text: 'text-amber-700',  bgLight: 'bg-amber-50',  bgDark: 'bg-amber-600' },
  coral:  { from: 'from-orange-50', ring: 'ring-orange-400', bg: 'bg-orange-400', border: 'border-orange-400', borderLight: 'border-orange-200', text: 'text-orange-700', bgLight: 'bg-orange-50', bgDark: 'bg-orange-600' },
}

// ─── Mood options ────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Sad' },
  { value: 2, emoji: '😴', label: 'Tired' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Happy' },
  { value: 5, emoji: '🤩', label: 'Excited' },
]

// ─── Color picker options ────────────────────────────────────────

const COLOR_OPTIONS = [
  { key: 'teal', label: 'Teal', swatch: 'bg-teal-400' },
  { key: 'blue', label: 'Blue', swatch: 'bg-blue-400' },
  { key: 'purple', label: 'Purple', swatch: 'bg-purple-400' },
  { key: 'green', label: 'Green', swatch: 'bg-green-400' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-400' },
  { key: 'coral', label: 'Coral', swatch: 'bg-orange-400' },
]

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
}: Props) {
  const [messageSent, setMessageSent] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [mood, setMood] = useState<number | null>(currentMood)
  const [moodFeedback, setMoodFeedback] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set(favoriteSessionIds))
  const [goalChoice, setGoalChoice] = useState<string | null>(athleteGoalChoice)
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(themeColor)
  const [colorFeedback, setColorFeedback] = useState<string | null>(null)
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

  const handleMood = useCallback(async (value: number) => {
    setMood(value)
    setMoodFeedback(null)
    const result = await saveAthleteMood(athlete.id, value)
    if (result.success) {
      setMoodFeedback('Got it!')
      setTimeout(() => setMoodFeedback(null), 3000)
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

  const handleColorChange = useCallback(async (color: string) => {
    setSelectedColor(color)
    setColorFeedback(null)
    const result = await setAthleteTheme(athlete.id, color)
    if (result.success) {
      setColorFeedback('Nice choice!')
      setTimeout(() => setColorFeedback(null), 3000)
    }
  }, [athlete.id])

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
    <main className={`min-h-screen bg-gradient-to-b ${theme.from} to-white pb-12`}>
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
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${theme.bgLight} flex items-center justify-center border-4 ${theme.borderLight}`}>
              <span className="text-4xl">🏃</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Hi {athlete.name}!
          </h1>
          <p className={`text-lg ${theme.text}`}>
            Great to see you!
          </p>
        </section>

        {/* ── Mood Picker ─────────────────────────────────── */}
        <section aria-label="How are you feeling today" className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>😊</span> How are you feeling today?
          </h2>
          <div className="flex justify-between gap-2">
            {MOOD_OPTIONS.map(m => {
              const selected = mood === m.value
              return (
                <button
                  key={m.value}
                  onClick={() => handleMood(m.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all
                    ${selected
                      ? `bg-white border-2 ${theme.ring.replace('ring', 'border')} shadow-sm`
                      : 'bg-white/60 border-2 border-transparent hover:bg-white'
                    }`}
                  aria-label={m.label}
                  aria-pressed={selected}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs text-gray-600">{m.label}</span>
                </button>
              )
            })}
          </div>
          <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
            {moodFeedback && (
              <p className={`text-sm ${theme.text} font-medium text-center`}>{moodFeedback}</p>
            )}
          </div>
        </section>

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
            <div className="bg-white border-l-4 border-amber-400 rounded-xl px-5 py-4 shadow-sm flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900">
                  Your longest run: {personalBest.distance_km.toFixed(1)} km
                </p>
                <p className="text-sm text-gray-500">
                  on {formatRunDate(personalBest.date)}
                </p>
                {/* Visual distance bar */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
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
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>⭐</span> My best runs
            </h2>
            <div className="space-y-2">
              {bestRuns.map(run => {
                const feel = run.feel ? FEEL_LABELS[run.feel] : null
                const km = run.distance_km ?? 0
                return (
                  <div
                    key={run.id}
                    className="bg-amber-50/50 border border-amber-100 border-l-4 border-l-amber-400 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm"
                  >
                    {feel && (
                      <div className="flex flex-col items-center flex-shrink-0 w-10">
                        <span className="text-2xl">{feel.emoji}</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{feel.label}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatRunDate(run.date)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {km > 0 ? (
                          <>
                            <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${Math.min((km / 5) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0 w-12 text-right">
                              {km.toFixed(1)} km
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">
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

        {/* ── Athlete Goal Choice ─────────────────────────── */}
        <section aria-label="Your focus" className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
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
                      : `bg-white border-2 border-gray-100 hover:${theme.borderLight} opacity-70`
                    }`}
                >
                  <span className="text-2xl flex-shrink-0">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      {g.label}
                      {selected && <span className={theme.text}>✓</span>}
                    </p>
                    <p className="text-sm text-gray-500">{g.desc}</p>
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
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🎯</span> Your goal
            </h2>
            <div className={`bg-white border ${theme.borderLight} rounded-xl px-5 py-4 shadow-sm`}>
              <p className="text-base font-semibold text-gray-900 mb-2">
                {goal.label}
              </p>
              {/* Visual progress bar */}
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
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
                    className={`bg-white border border-gray-100 border-l-4 ${theme.border} rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm`}
                  >
                    {feel && (
                      <div className="flex flex-col items-center flex-shrink-0 w-10">
                        <span className="text-2xl">{feel.emoji}</span>
                        <span className="text-[10px] text-gray-500 mt-0.5">{feel.label}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatRunDate(run.date)}
                      </p>
                      {/* Visual distance bar alongside number */}
                      <div className="flex items-center gap-2 mt-1">
                        {km > 0 ? (
                          <>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${theme.bg} rounded-full`}
                                style={{ width: `${Math.min((km / 5) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0 w-12 text-right">
                              {km.toFixed(1)} km
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No distance recorded
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Heart favorite toggle */}
                    <button
                      onClick={() => handleFavorite(run.id)}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors hover:bg-red-50"
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

        {/* ── Theme Color Picker ─────────────────────────── */}
        <section aria-label="Pick your color" className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🎨</span> Pick your color
          </h2>
          <div className="flex justify-between gap-2">
            {COLOR_OPTIONS.map(c => {
              const selected = selectedColor === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => handleColorChange(c.key)}
                  className={`w-14 h-14 rounded-full ${c.swatch} flex items-center justify-center transition-all
                    ${selected ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-80'}`}
                  aria-label={`${c.label}${selected ? ' (selected)' : ''}`}
                  aria-pressed={selected}
                >
                  {selected && <span className="text-white text-lg font-bold drop-shadow-sm">✓</span>}
                </button>
              )
            })}
          </div>
          <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
            {colorFeedback && (
              <p className={`text-sm ${theme.text} font-medium text-center`}>{colorFeedback}</p>
            )}
          </div>
        </section>

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
                className={`h-14 bg-white border-2 ${theme.borderLight} hover:${theme.border} hover:${theme.bgLight}
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
              <p className="text-base text-red-600 font-medium text-center">
                {messageError}
              </p>
            )}
          </div>
          {lastSentMessage && !messageSent && (
            <p className="text-sm text-gray-500 text-center mt-2">
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
    <div className={`bg-white border ${borderColor} rounded-xl px-3 py-4 text-center shadow-sm`}>
      <span className="text-2xl block mb-1">{icon}</span>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      {/* Visual bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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
  const borderColor = isGold ? 'border-amber-200' : themeBorderLight
  const glowClass = weeks >= 5 ? 'ring-2 ring-amber-200' : ''

  return (
    <div className={`bg-white border ${borderColor} ${glowClass} rounded-xl px-3 py-4 text-center shadow-sm`}>
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
      <p className="text-2xl font-bold text-gray-900">{weeks}</p>
      <p className="text-sm text-gray-600 mb-2">
        {weeks === 0 ? 'No streak yet' : weeks === 1 ? 'week' : 'weeks'}
      </p>
      {weeks > 0 && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isGold ? 'bg-amber-400' : themeBarColor}`}
            style={{ width: `${Math.min((weeks / 8) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
