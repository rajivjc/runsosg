import Link from 'next/link'
import type { CaregiverFocusData } from '@/lib/feed/today-focus'

interface Props {
  milestones: { id: string; label: string; icon: string; achieved_at: string }[]
  nextMilestone: CaregiverFocusData['nextMilestone'] | null
}

export default function CaregiverMilestoneCard({ milestones, nextMilestone }: Props) {
  if (milestones.length === 0 && !nextMilestone) return null

  return (
    <div className="bg-white border border-amber-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2.5">Milestones & progress</p>

      {milestones.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {milestones.map(m => (
              <Link key={m.id} href={`/milestone/${m.id}`}>
                <span className="inline-flex items-center gap-1 bg-amber-50/70 hover:bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors">
                  {m.icon ?? '🏆'} {m.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {nextMilestone && (
        <div className="bg-amber-50/40 rounded-lg px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-800">
              {nextMilestone.icon} {nextMilestone.label}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">
              {nextMilestone.current}/{nextMilestone.target}
            </span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-1.5">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((nextMilestone.current / nextMilestone.target) * 100))}%` }}
            />
          </div>
          {(nextMilestone.target - nextMilestone.current) <= 2 && (
            <p className="text-[10px] text-amber-600 mt-1">
              Just {nextMilestone.target - nextMilestone.current} more run{(nextMilestone.target - nextMilestone.current) !== 1 ? 's' : ''} to go!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
