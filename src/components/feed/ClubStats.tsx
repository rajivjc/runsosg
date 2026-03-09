import type { ClubBestWeek } from '@/lib/analytics/club-records'

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
  }
}

function TrendArrow({ current, previous, label }: { current: number; previous: number; label: string }) {
  const diff = current - previous
  if (diff > 0) return <span className="text-green-600">↑ {diff} more {label}</span>
  if (diff < 0) return <span className="text-red-500">↓ {Math.abs(diff)} fewer {label}</span>
  if (previous > 0) return <span className="text-gray-400">— same {label}</span>
  return null
}

export default function ClubStats({ stats }: Props) {
  if (stats.sessions === 0) return null

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/60 rounded-xl px-4 py-4 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Club stats — all time</p>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{stats.sessions}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">runs</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{stats.km.toFixed(1)}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">km</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{stats.athletes}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">athletes</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-extrabold text-gray-900">{stats.milestones}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">milestones</p>
        </div>
      </div>

      {/* Monthly comparison */}
      {(stats.thisMonthSessions > 0 || stats.lastMonthSessions > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-700">This month</p>
              <p className="text-[10px] text-gray-400">{stats.thisMonthSessions} run{stats.thisMonthSessions !== 1 ? 's' : ''} · {stats.thisMonthKm.toFixed(1)} km</p>
            </div>
            <div className="text-right text-[10px] font-medium space-y-0.5">
              <p><TrendArrow current={stats.thisMonthSessions} previous={stats.lastMonthSessions} label="runs" /></p>
            </div>
          </div>
        </div>
      )}

      {/* Club record */}
      {stats.bestWeek && stats.bestWeek.sessions >= 3 && (
        <div className="mt-2 pt-2 border-t border-gray-200/60">
          <p className="text-[10px] text-gray-400 text-center">
            🏆 Best week: {stats.bestWeek.sessions} runs{stats.bestWeek.km > 0 ? `, ${stats.bestWeek.km} km` : ''} ({stats.bestWeek.weekLabel})
          </p>
        </div>
      )}

      {(stats.coaches > 0 || stats.caregivers > 0) && (
        <p className="text-[11px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-200/60">
          {stats.coaches > 0 && <span>{stats.coaches} coach{stats.coaches !== 1 ? 'es' : ''}</span>}
          {stats.coaches > 0 && stats.caregivers > 0 && <span> · </span>}
          {stats.caregivers > 0 && <span>{stats.caregivers} caregiver{stats.caregivers !== 1 ? 's' : ''}</span>}
        </p>
      )}
    </div>
  )
}
