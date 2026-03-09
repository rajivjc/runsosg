'use client'

interface Props {
  weeklyActivity: { weekStart: string; active: boolean }[]
  current: number
  longest: number
  variant?: 'teal' | 'amber'
}

export default function StreakCalendar({ weeklyActivity, current, longest, variant = 'teal' }: Props) {
  const isTeal = variant === 'teal'
  const activeBg = isTeal ? 'bg-teal-500' : 'bg-amber-500'
  const activeRing = isTeal ? 'ring-teal-200' : 'ring-amber-200'
  const textColor = isTeal ? 'text-teal-700' : 'text-amber-700'
  const mutedColor = isTeal ? 'text-teal-500' : 'text-amber-500'

  // Format week start as short label (e.g. "3 Mar")
  function formatWeek(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }

  const firstLabel = weeklyActivity.length > 0 ? formatWeek(weeklyActivity[0].weekStart) : ''
  const lastLabel = weeklyActivity.length > 0 ? formatWeek(weeklyActivity[weeklyActivity.length - 1].weekStart) : ''

  return (
    <div className="space-y-2">
      {/* Streak numbers */}
      <div className="flex items-baseline gap-3">
        {current > 0 && (
          <span className={`text-sm font-bold ${textColor}`}>
            🔥 {current}-week streak
          </span>
        )}
        {current === 0 && (
          <span className="text-sm text-gray-400">No active streak</span>
        )}
        {longest > 0 && longest > current && (
          <span className={`text-xs ${mutedColor}`}>
            Best: {longest} weeks
          </span>
        )}
      </div>

      {/* Week circles */}
      <div className="flex items-center gap-1.5">
        {weeklyActivity.map((week, i) => (
          <div
            key={week.weekStart}
            className={`w-5 h-5 rounded-full flex-shrink-0 ${
              week.active
                ? `${activeBg} ring-2 ${activeRing}`
                : 'bg-gray-100 border border-gray-200'
            }`}
            title={`Week of ${formatWeek(week.weekStart)}${week.active ? ' — active' : ''}`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        <span className="text-[10px] text-gray-400">{firstLabel}</span>
        <span className="text-[10px] text-gray-400">{lastLabel}</span>
      </div>
    </div>
  )
}
