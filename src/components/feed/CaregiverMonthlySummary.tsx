import { formatPace } from '@/lib/utils/dates'

interface Props {
  athleteFirstName: string
  thisMonth: { runs: number; km: number; durationSeconds: number }
  lastMonth: { runs: number; km: number }
}

export default function CaregiverMonthlySummary({ athleteFirstName, thisMonth, lastMonth }: Props) {
  // Don't show if no sessions this month or last month
  if (thisMonth.runs === 0 && lastMonth.runs === 0) return null
  // Only show if there's enough data to be useful (at least 1 run this month)
  if (thisMonth.runs === 0) return null

  const avgDistanceThis = thisMonth.runs > 0 ? thisMonth.km / thisMonth.runs : 0
  const avgDistanceLast = lastMonth.runs > 0 ? lastMonth.km / lastMonth.runs : 0
  const pace = formatPace(thisMonth.km, thisMonth.durationSeconds)

  const hasLastMonth = lastMonth.runs > 0
  const distanceTrend = hasLastMonth ? avgDistanceThis - avgDistanceLast : 0

  // Find longest run this month — we only have aggregate data, so show avg
  // For the trend arrow
  const trendIcon = distanceTrend > 0.05 ? '↑' : distanceTrend < -0.05 ? '↓' : '→'
  const trendColor = distanceTrend > 0.05 ? 'text-green-600' : distanceTrend < -0.05 ? 'text-orange-500' : 'text-gray-500'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
        {athleteFirstName} this month
      </p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{thisMonth.runs}</p>
          <p className="text-[10px] text-gray-500 font-medium">run{thisMonth.runs !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">{thisMonth.km.toFixed(1)}</p>
          <p className="text-[10px] text-gray-500 font-medium">km total</p>
        </div>
        {pace && (
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{pace.replace('/km', '')}</p>
            <p className="text-[10px] text-gray-500 font-medium">per km avg</p>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          Average distance: {avgDistanceThis.toFixed(1)} km per run
        </p>
        {hasLastMonth && (
          <p>
            vs last month: {avgDistanceLast.toFixed(1)} km → {avgDistanceThis.toFixed(1)} km{' '}
            <span className={`font-semibold ${trendColor}`}>{trendIcon}</span>
          </p>
        )}
      </div>
    </div>
  )
}
