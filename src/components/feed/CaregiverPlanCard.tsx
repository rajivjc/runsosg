import { formatDate } from '@/lib/utils/dates'
import type { ProgressLevel } from '@/lib/supabase/types'
import type { GoalProgress } from '@/lib/goals'

const PROGRESS_LEVELS: Record<
  ProgressLevel,
  { label: string; emoji: string; colorClass: string; bgClass: string; borderClass: string }
> = {
  just_started: {
    label: 'Just started',
    emoji: '🌱',
    colorClass: 'text-slate-600 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-800/40',
    borderClass: 'border-slate-300/20',
  },
  making_progress: {
    label: 'Making progress',
    emoji: '📈',
    colorClass: 'text-teal-600 dark:text-teal-300',
    bgClass: 'bg-teal-50 dark:bg-teal-900/30',
    borderClass: 'border-teal-600/10',
  },
  almost_there: {
    label: 'Almost there',
    emoji: '⭐',
    colorClass: 'text-amber-600 dark:text-amber-300',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    borderClass: 'border-amber-600/10',
  },
  achieved: {
    label: 'Achieved',
    emoji: '✅',
    colorClass: 'text-green-600 dark:text-green-300',
    bgClass: 'bg-green-50 dark:bg-green-900/30',
    borderClass: 'border-green-600/10',
  },
}

export interface CaregiverPlanCardProps {
  athleteFirstName: string
  // Focus
  focusTitle: string | null
  focusProgressNote: string | null
  focusProgressLevel: ProgressLevel | null
  focusUpdatedAt: string | null
  focusCoachName: string | null
  // Goal
  runningGoal: string | null
  goalProgress: GoalProgress | null
  // Most recent achieved focus
  recentAchievement: string | null
}

export default function CaregiverPlanCard({
  athleteFirstName,
  focusTitle,
  focusProgressNote,
  focusProgressLevel,
  focusUpdatedAt,
  focusCoachName,
  runningGoal,
  goalProgress,
  recentAchievement,
}: CaregiverPlanCardProps) {
  // Empty state: no focus AND no goal
  if (!focusTitle && !runningGoal) {
    return (
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-400/20 rounded-2xl px-5 py-4 mb-5 shadow-sm">
        <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest mb-2">
          Coach&apos;s plan for {athleteFirstName}
        </p>
        <p className="text-sm text-text-secondary">
          No training plan set yet. Check back soon!
        </p>
      </div>
    )
  }

  const pl = focusProgressLevel ? PROGRESS_LEVELS[focusProgressLevel] : null

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-100 dark:border-teal-400/20 rounded-2xl px-5 py-4 mb-5 shadow-sm">
      {/* Header */}
      <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest mb-2.5">
        Coach&apos;s plan for {athleteFirstName}
      </p>

      {/* Focus title + progress level badge */}
      {focusTitle && (
        <div className="mb-2">
          <p className="text-sm font-semibold text-text-primary leading-relaxed">
            {focusTitle}
          </p>
          {pl && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 border ${pl.bgClass} ${pl.colorClass} ${pl.borderClass}`}
            >
              {pl.emoji} {pl.label}
            </span>
          )}
        </div>
      )}

      {/* Progress note in white box with left teal border */}
      {focusProgressNote && (
        <div className="mt-2.5 px-3 py-2 bg-white/60 dark:bg-white/8 rounded-lg border-l-[3px] border-l-teal-600 dark:border-l-teal-400">
          <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 mb-0.5">
            Recent progress
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {focusProgressNote}
          </p>
        </div>
      )}

      {/* Horizontal divider */}
      {focusTitle && runningGoal && (
        <div className="h-px bg-teal-100 dark:bg-teal-400/20 my-3" />
      )}

      {/* Goal text + progress bar */}
      {runningGoal && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">🎯</span>
            <span className="text-[13px] font-semibold text-text-primary">
              {runningGoal}
            </span>
          </div>
          {goalProgress && (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-2 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-500"
                    style={{ width: `${goalProgress.pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-300">
                  {goalProgress.current}/{goalProgress.target} {goalProgress.unit}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recently achieved */}
      {recentAchievement && (
        <div className="mt-3 flex items-center gap-1.5 px-2 py-1.5 bg-white/50 dark:bg-white/8 rounded-lg">
          <span className="text-xs">✅</span>
          <span className="text-[11px] text-text-secondary">
            Recently achieved: <strong>{recentAchievement}</strong>
          </span>
        </div>
      )}

      {/* Updated by coach · date */}
      {focusUpdatedAt && (
        <p className="text-[10px] text-teal-500 dark:text-teal-400/60 mt-2.5">
          {focusCoachName ? `Updated by ${focusCoachName}` : 'Updated'} · {formatDate(focusUpdatedAt)}
        </p>
      )}
    </div>
  )
}
