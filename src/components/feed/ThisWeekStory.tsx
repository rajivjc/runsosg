import Link from 'next/link'
import { getDistanceEquivalent } from '@/lib/feed/utils'
import type { WeeklyRecap } from '@/lib/feed/weekly-recap'
import type { FocusItem } from '@/lib/feed/today-focus'
import type { CoachFeedData } from '@/lib/feed/types'

interface ThisWeekStoryProps {
  weeklyStats: { count: number; km: number; athletes: number }
  weeklyRecap: WeeklyRecap
  celebrations: FocusItem[]
  clubStats: CoachFeedData['clubStats']
}

function getHeadline(weeklyStats: { count: number }, celebrationCount: number): string {
  if (weeklyStats.count === 0) return 'Quiet week so far'
  if (weeklyStats.count >= 3 && celebrationCount >= 2) return 'A great week for the club'
  return 'A good week for the club'
}

interface CelebrationRow {
  key: string
  icon: string
  athleteId: string
  athleteName: string
  title: string
  subtitle?: string
}

function buildCelebrationRows(
  celebrations: FocusItem[],
  starMoment: WeeklyRecap['starMoment']
): CelebrationRow[] {
  const rows: CelebrationRow[] = []
  const seenAthletes = new Set<string>()

  for (const item of celebrations) {
    const icon = item.type === 'personal_best' ? '🏅' : '🏆'
    // Extract "(was X km)" from subtitle for sub-line display
    const wasMatch = item.subtitle.match(/\(was .+\)/)
    rows.push({
      key: `${item.type}-${item.athleteId}`,
      icon,
      athleteId: item.athleteId,
      athleteName: item.athleteName,
      title: item.title,
      subtitle: wasMatch ? wasMatch[0] : undefined,
    })
    seenAthletes.add(item.athleteName)
  }

  // Add star moment if not already represented
  if (starMoment && !seenAthletes.has(starMoment.athleteName)) {
    rows.push({
      key: `star-${starMoment.athleteName}`,
      icon: '⭐',
      athleteId: '', // star moment doesn't have athleteId in WeeklyRecap
      athleteName: starMoment.athleteName,
      title: `${starMoment.athleteName} ${starMoment.value}`,
    })
  }

  return rows
}

export default function ThisWeekStory({
  weeklyStats,
  weeklyRecap,
  celebrations,
  clubStats,
}: ThisWeekStoryProps) {
  const headline = getHeadline(weeklyStats, celebrations.length)
  const celebrationRows = buildCelebrationRows(celebrations, weeklyRecap.starMoment)
  const equiv = getDistanceEquivalent(clubStats.km)

  return (
    <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm mb-5">
      {/* Header section */}
      <div className="px-4 py-4">
        <p className="text-[11px] font-semibold text-text-hint uppercase tracking-wide mb-2" style={{ letterSpacing: '0.5px' }}>
          This week&apos;s story
        </p>
        <p className="text-base font-bold text-text-primary">{headline}</p>
        <div className="flex items-center gap-1 flex-wrap text-sm mt-1">
          <span>
            <span className="font-semibold text-text-primary">{weeklyStats.count}</span>{' '}
            <span className="text-text-secondary">runs</span>
          </span>
          <span className="text-text-hint">·</span>
          <span>
            <span className="font-semibold text-text-primary">{weeklyStats.km.toFixed(1)}</span>{' '}
            <span className="text-text-secondary">km</span>
          </span>
          <span className="text-text-hint">·</span>
          <span>
            <span className="font-semibold text-text-primary">{weeklyStats.athletes}</span>{' '}
            <span className="text-text-secondary">athletes</span>
          </span>
          <span className="text-text-hint">·</span>
          <span>
            <span className="font-semibold text-text-primary">{weeklyRecap.milestonesEarned}</span>{' '}
            <span className="text-text-secondary">milestones</span>
          </span>
        </div>
      </div>

      {/* Celebrations list */}
      {celebrationRows.length > 0 && (
        <div className="border-t border-border">
          {celebrationRows.map((row, i) => {
            const inner = (
              <div className={`flex items-center gap-3 px-4 min-h-[44px] hover:bg-surface-raised transition-colors${i > 0 ? ' border-t border-border' : ''}`}>
                <span className="text-base flex-shrink-0">{row.icon}</span>
                <div className="flex-1 min-w-0 py-2">
                  <p className="text-sm font-medium text-text-primary truncate">{row.title}</p>
                  {row.subtitle && (
                    <p className="text-xs text-text-muted">{row.subtitle}</p>
                  )}
                </div>
                <span className="text-text-hint flex-shrink-0 text-sm">&#x203A;</span>
              </div>
            )

            if (row.athleteId) {
              return (
                <Link key={row.key} href={`/athletes/${row.athleteId}`}>
                  {inner}
                </Link>
              )
            }
            return <div key={row.key}>{inner}</div>
          })}
        </div>
      )}

      {/* All-time stats footer */}
      <div className="border-t-[3px] border-teal-500 bg-surface-alt px-4 py-4">
        <p className="text-[10px] font-semibold text-text-hint uppercase tracking-widest mb-3">
          Your club — all time
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{clubStats.sessions}</p>
            <p className="text-[10px] text-text-hint font-medium">runs</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{clubStats.km.toFixed(1)}</p>
            <p className="text-[10px] text-text-hint font-medium">km</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{clubStats.athletes}</p>
            <p className="text-[10px] text-text-hint font-medium">athletes</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text-primary">{clubStats.milestones}</p>
            <p className="text-[10px] text-text-hint font-medium">milestones</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/60 text-center">
          <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
            {clubStats.km.toFixed(1)} km — {equiv.label}
          </p>
        </div>
      </div>
    </div>
  )
}
