'use client'

import type { WeeklyRecap } from '@/lib/feed/weekly-recap'

interface Props {
  weeklyStats: { count: number; km: number; athletes: number }
  weeklyRecap: WeeklyRecap
  tagline?: string
}

export default function WeeklyRecapCard({ weeklyStats, weeklyRecap, tagline }: Props) {
  if (weeklyStats.count === 0) return null

  return (
    <div className="bg-surface border border-border-subtle rounded-xl px-4 py-3 mb-5 shadow-sm">
      <div className="flex items-center gap-3 recap-stat recap-stat-1">
        <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🏃</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {weeklyStats.count} run{weeklyStats.count !== 1 ? 's' : ''} this week
          </p>
          <p className="text-xs text-text-muted">
            {weeklyStats.km.toFixed(1)} km across {weeklyStats.athletes} athlete{weeklyStats.athletes !== 1 ? 's' : ''} — {(tagline ?? 'growing together').toLowerCase()}
          </p>
        </div>
      </div>
      {(weeklyRecap.starMoment || weeklyRecap.milestonesEarned > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
          {weeklyRecap.starMoment && (
            <p className="text-xs text-teal-600 dark:text-teal-300 recap-stat recap-stat-2">
              ⭐ {weeklyRecap.starMoment.athleteName} {weeklyRecap.starMoment.value}
            </p>
          )}
          {weeklyRecap.milestonesEarned > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-300 recap-stat recap-stat-3">
              🏆 {weeklyRecap.milestonesEarned} milestone{weeklyRecap.milestonesEarned !== 1 ? 's' : ''} earned this week
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes recapFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .recap-stat {
          animation: recapFadeIn 300ms ease-out both;
        }
        .recap-stat-1 { animation-delay: 0ms; }
        .recap-stat-2 { animation-delay: 150ms; }
        .recap-stat-3 { animation-delay: 300ms; }
        @media (prefers-reduced-motion: reduce) {
          .recap-stat {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
