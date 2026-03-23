'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveFocusArea, updateAthleteGoal } from '@/app/athletes/[id]/actions'
import { formatDate } from '@/lib/utils/dates'
import type { FocusArea, ProgressLevel } from '@/lib/supabase/types'
import type { GoalProgress } from '@/lib/goals'

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRESS_LEVELS: {
  value: ProgressLevel
  label: string
  emoji: string
  bg: string
  text: string
  darkBg: string
  darkText: string
  border: string
  darkBorder: string
}[] = [
  {
    value: 'just_started',
    label: 'Just started',
    emoji: '🌱',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    darkBg: 'dark:bg-slate-800/50',
    darkText: 'dark:text-slate-300',
    border: 'border-slate-400',
    darkBorder: 'dark:border-slate-400',
  },
  {
    value: 'making_progress',
    label: 'Making progress',
    emoji: '📈',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    darkBg: 'dark:bg-teal-900/30',
    darkText: 'dark:text-teal-300',
    border: 'border-teal-500',
    darkBorder: 'dark:border-teal-400',
  },
  {
    value: 'almost_there',
    label: 'Almost there',
    emoji: '⭐',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-300',
    border: 'border-amber-500',
    darkBorder: 'dark:border-amber-400',
  },
  {
    value: 'achieved',
    label: 'Achieved',
    emoji: '✅',
    bg: 'bg-green-50',
    text: 'text-green-600',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-300',
    border: 'border-green-500',
    darkBorder: 'dark:border-green-400',
  },
]

const GOAL_TYPES = [
  { value: 'distance_total', label: 'Total distance (km)' },
  { value: 'distance_single', label: 'Single run distance (km)' },
  { value: 'session_count', label: 'Number of sessions' },
]

const ATHLETE_GOAL_CHOICES: Record<string, { label: string; description: string; icon: string }> = {
  run_further: { label: 'Run further', description: 'Try to run a longer distance each time', icon: '📏' },
  run_more: { label: 'Run more often', description: 'Try to run more frequently', icon: '📅' },
  feel_stronger: { label: 'Feel stronger', description: 'Build strength and confidence', icon: '💪' },
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type PlanTabProps = {
  athleteId: string
  athleteName: string
  // Section 1: Current Focus
  activeFocus: FocusArea | null
  // Section 2: Goal
  runningGoal: string | null
  goalType: string | null
  goalTarget: number | null
  goalProgress: GoalProgress | null
  // Section 3: Athlete's Pick
  athleteGoalChoice: string | null
  goalChoiceUpdatedAt: string | null
  previousGoalChoice: string | null
  previousGoalChoiceAt: string | null
  // Section 4: Focus History
  focusHistory: FocusArea[]
  // Permissions
  isReadOnly: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(d)
}

function calculateDuration(createdAt: string | null, achievedAt: string | null): string {
  if (!createdAt || !achievedAt) return ''
  const start = new Date(createdAt)
  const end = new Date(achievedAt)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''
  const diffMs = end.getTime() - start.getTime()
  const weeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
  if (weeks < 1) return 'less than a week'
  return `${weeks} week${weeks === 1 ? '' : 's'}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlanTab({
  athleteId,
  athleteName,
  activeFocus,
  runningGoal,
  goalType,
  goalTarget,
  goalProgress,
  athleteGoalChoice,
  goalChoiceUpdatedAt,
  previousGoalChoice,
  previousGoalChoiceAt,
  focusHistory,
  isReadOnly,
}: PlanTabProps) {
  const firstName = athleteName.split(' ')[0]

  // ── Focus editing state ──
  const [editingFocus, setEditingFocus] = useState(false)
  const [focusDraft, setFocusDraft] = useState({
    title: activeFocus?.title ?? '',
    progress_note: activeFocus?.progress_note ?? '',
    progress_level: (activeFocus?.progress_level ?? 'just_started') as ProgressLevel,
  })
  const [isPendingFocus, startFocusTransition] = useTransition()

  // ── Goal editing state ──
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState({
    text: runningGoal ?? '',
    type: goalType ?? 'distance_total',
    target: goalTarget ?? 0,
  })
  const [isPendingGoal, startGoalTransition] = useTransition()

  // ── Focus history toggle ──
  const [showHistory, setShowHistory] = useState(false)

  // ── Toast ──
  const [showSaved, setShowSaved] = useState(false)

  const router = useRouter()

  function flash() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  // ── Focus save ──
  function handleSaveFocus() {
    startFocusTransition(async () => {
      const result = await saveFocusArea(athleteId, {
        id: activeFocus?.id,
        title: focusDraft.title,
        progress_note: focusDraft.progress_note || null,
        progress_level: focusDraft.progress_level,
      })
      if (!result.error) {
        setEditingFocus(false)
        flash()
        router.refresh()
      }
    })
  }

  function handleCancelFocus() {
    setFocusDraft({
      title: activeFocus?.title ?? '',
      progress_note: activeFocus?.progress_note ?? '',
      progress_level: (activeFocus?.progress_level ?? 'just_started') as ProgressLevel,
    })
    setEditingFocus(false)
  }

  function startEditingFocus() {
    setFocusDraft({
      title: activeFocus?.title ?? '',
      progress_note: activeFocus?.progress_note ?? '',
      progress_level: (activeFocus?.progress_level ?? 'just_started') as ProgressLevel,
    })
    setEditingFocus(true)
  }

  // ── Goal save ──
  function handleSaveGoal() {
    startGoalTransition(async () => {
      const result = await updateAthleteGoal(athleteId, {
        running_goal: goalDraft.text || null,
        goal_type: goalDraft.type || null,
        goal_target: goalDraft.target || null,
      })
      if (!result.error) {
        setEditingGoal(false)
        flash()
        router.refresh()
      }
    })
  }

  function handleCancelGoal() {
    setGoalDraft({
      text: runningGoal ?? '',
      type: goalType ?? 'distance_total',
      target: goalTarget ?? 0,
    })
    setEditingGoal(false)
  }

  function startEditingGoal() {
    setGoalDraft({
      text: runningGoal ?? '',
      type: goalType ?? 'distance_total',
      target: goalTarget ?? 0,
    })
    setEditingGoal(true)
  }

  // ── Progress level badge ──
  const pl = PROGRESS_LEVELS.find(p => p.value === activeFocus?.progress_level)

  // ── Athlete pick info ──
  const pick = athleteGoalChoice ? ATHLETE_GOAL_CHOICES[athleteGoalChoice] : null
  const previousPick = previousGoalChoice ? ATHLETE_GOAL_CHOICES[previousGoalChoice] : null

  return (
    <div className="space-y-4">
      {/* ── Section 1: Current Focus ── */}
      {editingFocus ? (
        <div className="bg-surface border border-teal-600 dark:border-teal-400 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest">
              Edit Current Focus
            </span>
            <button
              onClick={handleCancelFocus}
              className="text-lg text-text-hint hover:text-text-secondary transition-colors leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cancel editing focus"
            >
              ×
            </button>
          </div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary mb-1">
            What is {firstName} working on right now?
          </label>
          <textarea
            value={focusDraft.title}
            onChange={e => setFocusDraft({ ...focusDraft, title: e.target.value })}
            rows={2}
            maxLength={300}
            placeholder="e.g. Walk-run intervals, building to 2 min running / 1 min walking"
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 resize-none bg-surface dark:bg-surface"
          />
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary mt-3 mb-1">
            Recent progress{' '}
            <span className="font-normal text-text-hint">(optional)</span>
          </label>
          <textarea
            value={focusDraft.progress_note}
            onChange={e => setFocusDraft({ ...focusDraft, progress_note: e.target.value })}
            rows={2}
            maxLength={300}
            placeholder="e.g. Can now run for 90 seconds without stopping"
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 resize-none bg-surface dark:bg-surface"
          />
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary mt-3 mb-1.5">
            How is it going?
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PROGRESS_LEVELS.map(lv => (
              <button
                key={lv.value}
                onClick={() => setFocusDraft({ ...focusDraft, progress_level: lv.value })}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[44px] ${
                  focusDraft.progress_level === lv.value
                    ? `${lv.bg} ${lv.text} ${lv.darkBg} ${lv.darkText} border-2 ${lv.border} ${lv.darkBorder}`
                    : 'bg-surface dark:bg-surface border border-border dark:border-border text-text-muted dark:text-text-muted'
                }`}
                aria-label={`Set progress to ${lv.label}`}
              >
                <span>{lv.emoji}</span> {lv.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-hint mt-3 italic">
            Visible to {firstName}&apos;s caregiver.
          </p>
          <div className="flex items-center justify-end gap-2 mt-3.5">
            <button
              onClick={handleCancelFocus}
              className="text-sm text-text-muted hover:text-text-secondary px-3 py-2 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFocus}
              disabled={isPendingFocus || !focusDraft.title.trim()}
              className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-50 px-5 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              {isPendingFocus ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : activeFocus ? (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-400/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest">
              Current Focus
            </span>
            {!isReadOnly && (
              <button
                onClick={startEditingFocus}
                className="text-xs font-semibold text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 px-2 py-1 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Edit current focus"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm font-semibold text-text-primary dark:text-text-primary leading-relaxed mb-2">
            {activeFocus.title}
          </p>
          {pl && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${pl.bg} ${pl.text} ${pl.darkBg} ${pl.darkText}`}
            >
              {pl.emoji} {pl.label}
            </span>
          )}
          {activeFocus.progress_note && (
            <div className="mt-3 p-2.5 bg-white/70 dark:bg-white/5 rounded-lg border-l-[3px] border-l-teal-600 dark:border-l-teal-400">
              <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider mb-0.5">
                Progress
              </p>
              <p className="text-[13px] text-text-secondary dark:text-text-secondary leading-relaxed">
                {activeFocus.progress_note}
              </p>
            </div>
          )}
          {activeFocus.updated_at && (
            <p className="text-[10px] text-teal-500 dark:text-teal-400/70 mt-2.5">
              Updated · {formatDate(activeFocus.updated_at)}
            </p>
          )}
        </div>
      ) : !isReadOnly ? (
        <div className="border border-dashed border-border dark:border-border rounded-xl px-4 py-4">
          <p className="text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">
            What is {firstName} working on right now?
          </p>
          <p className="text-xs text-text-muted dark:text-text-muted mb-3">
            Add a focus area to track what {firstName} is working toward.
          </p>
          <button
            onClick={startEditingFocus}
            className="text-sm font-medium text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 transition-colors min-h-[44px]"
            aria-label="Add focus area"
          >
            Add focus
          </button>
        </div>
      ) : null}

      {/* ── Section 2: Goal ── */}
      {editingGoal ? (
        <div className="bg-surface dark:bg-surface border border-teal-600 dark:border-teal-400 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-widest">
              Edit Goal
            </span>
            <button
              onClick={handleCancelGoal}
              className="text-lg text-text-hint hover:text-text-secondary transition-colors leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cancel editing goal"
            >
              ×
            </button>
          </div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary mb-1">
            Running goal
          </label>
          <input
            value={goalDraft.text}
            onChange={e => setGoalDraft({ ...goalDraft, text: e.target.value })}
            placeholder="e.g. Run 50 km by end of 2026"
            className="w-full text-sm border border-border dark:border-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 bg-surface dark:bg-surface"
          />
          <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-400/20">
            <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 mb-2">
              Track goal progress
            </p>
            <div className="flex gap-2.5">
              <div className="flex-[2]">
                <label className="block text-[11px] text-text-muted dark:text-text-muted mb-0.5">
                  Goal type
                </label>
                <select
                  value={goalDraft.type}
                  onChange={e => setGoalDraft({ ...goalDraft, type: e.target.value })}
                  className="w-full border border-border dark:border-border rounded-lg px-2.5 py-2 text-xs bg-surface dark:bg-surface focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 min-h-[44px]"
                  aria-label="Goal type"
                >
                  {GOAL_TYPES.map(ty => (
                    <option key={ty.value} value={ty.value}>
                      {ty.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-text-muted dark:text-text-muted mb-0.5">
                  Target
                </label>
                <input
                  type="number"
                  value={goalDraft.target}
                  onChange={e => setGoalDraft({ ...goalDraft, target: Number(e.target.value) })}
                  className="w-full border border-border dark:border-border rounded-lg px-2.5 py-2 text-xs bg-surface dark:bg-surface focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 min-h-[44px]"
                  aria-label="Goal target"
                />
              </div>
            </div>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-2">
              Shows a progress bar on the athlete profile and caregiver feed.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3.5">
            <button
              onClick={handleCancelGoal}
              className="text-sm text-text-muted hover:text-text-secondary px-3 py-2 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGoal}
              disabled={isPendingGoal}
              className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-50 px-5 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              {isPendingGoal ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : runningGoal ? (
        <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-extrabold text-text-muted dark:text-text-muted uppercase tracking-widest">
              🎯 Goal
            </span>
            {!isReadOnly && (
              <button
                onClick={startEditingGoal}
                className="text-xs font-semibold text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 px-2 py-1 rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Edit goal"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm font-semibold text-text-primary dark:text-text-primary mb-2.5">
            {runningGoal}
          </p>
          {goalProgress && (
            <>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex-1 h-2 bg-teal-100 dark:bg-teal-900/30 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={goalProgress.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Goal progress: ${goalProgress.pct}%`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${goalProgress.pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-300 min-w-[40px] text-right">
                  {goalProgress.pct}%
                </span>
              </div>
              <p className="text-xs text-text-muted dark:text-text-muted mt-1.5">
                {goalProgress.current} / {goalProgress.target} {goalProgress.unit}
              </p>
            </>
          )}
        </div>
      ) : !isReadOnly ? (
        <div className="bg-surface dark:bg-surface border border-dashed border-border dark:border-border rounded-xl px-4 py-4">
          <p className="text-sm font-medium text-text-secondary dark:text-text-secondary mb-1">
            No goal set yet.
          </p>
          <p className="text-xs text-text-muted dark:text-text-muted mb-3">
            Add a measurable target for {firstName}.
          </p>
          <button
            onClick={startEditingGoal}
            className="text-sm font-medium text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-200 transition-colors min-h-[44px]"
            aria-label="Set goal"
          >
            Set goal
          </button>
        </div>
      ) : (
        <div className="bg-surface dark:bg-surface border border-border dark:border-border rounded-xl px-4 py-4">
          <span className="text-[10px] font-extrabold text-text-muted dark:text-text-muted uppercase tracking-widest">
            🎯 Goal
          </span>
          <p className="text-sm text-text-muted dark:text-text-muted mt-2">
            No goal set yet.
          </p>
        </div>
      )}

      {/* ── Section 3: Athlete's Pick ── */}
      {pick && athleteGoalChoice && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/30 rounded-xl p-3.5">
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            {firstName}&apos;s own goal
          </span>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-xl w-9 h-9 flex items-center justify-center bg-white dark:bg-white/10 rounded-lg border border-amber-200 dark:border-amber-400/30">
              {pick.icon}
            </span>
            <div>
              <p className="text-[13px] font-bold text-text-primary dark:text-text-primary">
                {pick.label}
              </p>
              <p className="text-[11px] text-text-muted dark:text-text-muted mt-px">
                {pick.description}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-400/70 mt-2 opacity-70">
            Chosen by {firstName} · {formatDate(goalChoiceUpdatedAt)}
          </p>
          {previousPick && previousGoalChoice && (
            <div className="mt-2 px-2.5 py-1.5 bg-white/60 dark:bg-white/5 rounded-lg flex items-center gap-1.5">
              <span className="text-xs">{previousPick.icon}</span>
              <p className="text-[11px] text-text-muted dark:text-text-muted">
                Previously:{' '}
                <span className="font-semibold">{previousPick.label}</span>{' '}
                <span className="text-text-hint dark:text-text-hint">
                  ({formatMonthYear(previousGoalChoiceAt)} – {formatMonthYear(goalChoiceUpdatedAt)})
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: Focus History ── */}
      {focusHistory.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 w-full bg-transparent border-none cursor-pointer py-2 text-[13px] font-semibold text-text-secondary dark:text-text-secondary min-h-[44px]"
            aria-expanded={showHistory}
            aria-label={`Focus history (${focusHistory.length} completed)`}
          >
            <span
              className="text-[11px] inline-block transition-transform duration-200"
              style={{ transform: showHistory ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              ▶
            </span>
            Focus history ({focusHistory.length} completed)
          </button>
          {showHistory && (
            <div className="pl-3.5 border-l-2 border-teal-100 dark:border-teal-400/20 ml-1.5 mt-1">
              {focusHistory.map((item, i) => (
                <div
                  key={item.id}
                  className={`py-2.5 ${i < focusHistory.length - 1 ? 'border-b border-border-subtle dark:border-border' : ''}`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs mt-0.5">✅</span>
                    <div>
                      <p className="text-[13px] font-semibold text-text-primary dark:text-text-primary leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-text-hint dark:text-text-hint mt-0.5">
                        Achieved {formatMonthYear(item.achieved_at)}
                        {calculateDuration(item.created_at, item.achieved_at) &&
                          ` · ${calculateDuration(item.created_at, item.achieved_at)}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toast ── */}
      {(isPendingFocus || isPendingGoal || showSaved) && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-sm rounded-xl shadow-lg px-5 py-3 flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] ${
            isPendingFocus || isPendingGoal ? 'bg-gray-900' : 'bg-teal-600'
          }`}
          aria-live="polite"
        >
          {isPendingFocus || isPendingGoal ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Saved</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
