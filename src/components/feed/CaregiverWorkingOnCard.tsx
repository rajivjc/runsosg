import { formatDate } from '@/lib/utils/dates'

interface Props {
  athleteFirstName: string
  workingOn: string
  recentProgress: string | null
  updatedAt: string | null
  coachName: string | null
}

export default function CaregiverWorkingOnCard({
  athleteFirstName,
  workingOn,
  recentProgress,
  updatedAt,
  coachName,
}: Props) {
  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl px-5 py-4 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-teal-700 uppercase tracking-widest mb-2">
        What {athleteFirstName} is working on
      </p>
      <p className="text-sm text-gray-800">{workingOn}</p>
      {recentProgress && (
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-teal-600 mb-0.5">Recent progress</p>
          <p className="text-sm text-gray-700">{recentProgress}</p>
        </div>
      )}
      {updatedAt && (
        <p className="text-[10px] text-teal-500 mt-2.5">
          {coachName ? `Updated by ${coachName}` : 'Updated'} · {formatDate(updatedAt)}
        </p>
      )}
    </div>
  )
}
