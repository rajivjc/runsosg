'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { getDistanceEquivalent } from '@/lib/feed/utils'
import type { ClubBestWeek } from '@/lib/analytics/club-records'
import type { WeeklyRecap } from '@/lib/feed/weekly-recap'

interface Props {
  stats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
    thisMonthSessions: number
    thisMonthKm: number
    lastMonthSessions: number
    lastMonthKm: number
    bestWeek: ClubBestWeek | null
    totalDurationSeconds: number
  }
  weeklyStats?: { count: number; km: number; athletes: number }
  weeklyRecap?: WeeklyRecap
}

const STORAGE_KEY = 'sosg_club_stats_expanded'

function TrendArrow({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous
  if (diff > 0) return <span className="text-green-600 dark:text-green-300">↑ {diff} more {label}</span>
  if (diff < 0) return <span className="text-red-500">↓ {Math.abs(diff)} fewer {label}</span>
  if (previous > 0) return <span className="text-text-hint">— same {label}</span>
  return null
}

export default function ClubStats({ stats, weeklyStats, weeklyRecap }: Props) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setExpanded(true)
    } catch {}
  }, [])

  if (stats.sessions === 0) return null

  function toggle() {
    const next = !expanded
    setExpanded(next)
    try { sessionStorage.setItem(STORAGE_KEY, String(next)) } catch {}
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-[#282842] dark:to-[#1E1E32] border border-border/60 rounded-xl px-4 py-4 mb-5 shadow-sm">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between min-h-[44px]"
      >
        <p className="text-[11px] font-bold text-text-hint uppercase tracking-widest">Club stats — all time</p>
        <ChevronDown
          className={`w-4 h-4 text-text-hint transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Collapsed summary row */}
      {!expanded && (
        <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
          <span><strong className="text-text-primary">{stats.sessions}</strong> runs</span>
          <span className="text-text-hint">·</span>
          <span><strong className="text-text-primary">{stats.km.toFixed(1)}</strong> km</span>
          <span className="text-text-hint">·</span>
          <span><strong className="text-text-primary">{stats.athletes}</strong> athletes</span>
          <span className="text-text-hint">·</span>
          <span><strong className="text-text-primary">{stats.milestones}</strong> milestones</span>
        </div>
      )}

      {/* Weekly summary inline (collapsed only) */}
      {!expanded && weeklyStats && weeklyStats.count > 0 && (
        <div className="mt-2 pt-2 border-t border-border/60">
          <p className="text-xs text-text-muted">
            This week: {weeklyStats.count} run{weeklyStats.count !== 1 ? 's' : ''} · {weeklyStats.km.toFixed(1)} km · {weeklyStats.athletes} athlete{weeklyStats.athletes !== 1 ? 's' : ''}
          </p>
          {weeklyRecap?.starMoment && (
            <p className="text-xs text-teal-600 dark:text-teal-300 mt-0.5">
              ⭐ {weeklyRecap.starMoment.athleteName} {weeklyRecap.starMoment.value}
            </p>
          )}
          {weeklyRecap && weeklyRecap.milestonesEarned > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              🏆 {weeklyRecap.milestonesEarned} milestone{weeklyRecap.milestonesEarned !== 1 ? 's' : ''} earned this week
            </p>
          )}
        </div>
      )}

      {/* Expanded full stats */}
      {expanded && (
        <>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-text-primary">{stats.sessions}</p>
              <p className="text-[10px] text-text-hint font-medium mt-0.5">runs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-text-primary">{stats.km.toFixed(1)}</p>
              <p className="text-[10px] text-text-hint font-medium mt-0.5">km</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-text-primary">{stats.athletes}</p>
              <p className="text-[10px] text-text-hint font-medium mt-0.5">athletes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-text-primary">{stats.milestones}</p>
              <p className="text-[10px] text-text-hint font-medium mt-0.5">milestones</p>
            </div>
          </div>

          {/* Distance equivalent */}
          {(() => {
            const equiv = getDistanceEquivalent(stats.km)
            return (
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-xs font-semibold text-text-secondary">
                  {stats.km.toFixed(1)} km — {equiv.label}
                </p>
                <div className="mt-1.5 h-2 bg-surface-alt rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(equiv.progress * 100, 2)}%` }}
                  />
                </div>
              </div>
            )
          })()}

          {/* Total training hours */}
          {stats.totalDurationSeconds > 0 && (() => {
            const totalHours = stats.totalDurationSeconds / 3600
            return (
              <div className="mt-2">
                <p className="text-xs font-semibold text-text-secondary">
                  {totalHours.toFixed(1)} hours of running together
                </p>
              </div>
            )
          })()}

          {/* Monthly comparison */}
          {(stats.thisMonthSessions > 0 || stats.lastMonthSessions > 0) && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-secondary">This month</p>
                  <p className="text-[10px] text-text-hint">{stats.thisMonthSessions} run{stats.thisMonthSessions !== 1 ? 's' : ''} · {stats.thisMonthKm.toFixed(1)} km</p>
                </div>
                <div className="text-right text-[10px] font-medium space-y-0.5">
                  <p><TrendArrow current={stats.thisMonthSessions} previous={stats.lastMonthSessions} label="runs" /></p>
                </div>
              </div>
            </div>
          )}

          {/* Club record */}
          {stats.bestWeek && stats.bestWeek.sessions >= 3 && (
            <div className="mt-2 pt-2 border-t border-border/60">
              <p className="text-[10px] text-text-hint text-center">
                🏆 Best week: {stats.bestWeek.sessions} runs{stats.bestWeek.km > 0 ? `, ${stats.bestWeek.km} km` : ''} ({stats.bestWeek.weekLabel})
              </p>
            </div>
          )}

          {/* Weekly recap (expanded view) */}
          {weeklyStats && weeklyStats.count > 0 && (
            <div className="mt-2 pt-2 border-t border-border/60">
              <p className="text-xs text-text-muted">
                This week: {weeklyStats.count} run{weeklyStats.count !== 1 ? 's' : ''} · {weeklyStats.km.toFixed(1)} km · {weeklyStats.athletes} athlete{weeklyStats.athletes !== 1 ? 's' : ''}
              </p>
              {weeklyRecap?.starMoment && (
                <p className="text-xs text-teal-600 dark:text-teal-300 mt-0.5">
                  ⭐ {weeklyRecap.starMoment.athleteName} {weeklyRecap.starMoment.value}
                </p>
              )}
              {weeklyRecap && weeklyRecap.milestonesEarned > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                  🏆 {weeklyRecap.milestonesEarned} milestone{weeklyRecap.milestonesEarned !== 1 ? 's' : ''} earned this week
                </p>
              )}
            </div>
          )}

          {(stats.coaches > 0 || stats.caregivers > 0) && (
            <p className="text-[11px] text-text-hint text-center mt-3 pt-3 border-t border-border/60">
              {stats.coaches > 0 && <span>{stats.coaches} coach{stats.coaches !== 1 ? 'es' : ''}</span>}
              {stats.coaches > 0 && stats.caregivers > 0 && <span> · </span>}
              {stats.caregivers > 0 && <span>{stats.caregivers} caregiver{stats.caregivers !== 1 ? 's' : ''}</span>}
            </p>
          )}
        </>
      )}
    </div>
  )
}
