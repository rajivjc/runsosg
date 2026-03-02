import type { WeeklyRecap } from '@/lib/feed/weekly-recap'

interface Props {
  weeklyStats: { count: number; km: number; athletes: number }
  weeklyRecap: WeeklyRecap
}

export default function WeeklyRecapCard({ weeklyStats, weeklyRecap }: Props) {
  if (weeklyStats.count === 0) return null

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🏃</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {weeklyStats.count} run{weeklyStats.count !== 1 ? 's' : ''} this week
          </p>
          <p className="text-xs text-gray-500">
            {weeklyStats.km.toFixed(1)} km across {weeklyStats.athletes} athlete{weeklyStats.athletes !== 1 ? 's' : ''} — growing together
          </p>
        </div>
      </div>
      {(weeklyRecap.starMoment || weeklyRecap.milestonesEarned > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
          {weeklyRecap.starMoment && (
            <p className="text-xs text-teal-600">
              ⭐ {weeklyRecap.starMoment.athleteName} {weeklyRecap.starMoment.value}
            </p>
          )}
          {weeklyRecap.milestonesEarned > 0 && (
            <p className="text-xs text-amber-600">
              🏆 {weeklyRecap.milestonesEarned} milestone{weeklyRecap.milestonesEarned !== 1 ? 's' : ''} earned this week
            </p>
          )}
        </div>
      )}
    </div>
  )
}
