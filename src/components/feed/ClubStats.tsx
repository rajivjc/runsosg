interface Props {
  stats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
  }
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
