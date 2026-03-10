import { formatDate } from '@/lib/utils/dates'
import CheerBox from '@/components/feed/CheerBox'
import CaregiverSharingControl from '@/components/feed/CaregiverSharingControl'
import type { FeedCheer } from '@/lib/feed/types'

interface Props {
  athleteId: string
  athleteFirstName: string
  athleteName: string
  cheersToday: number
  sentCheers: FeedCheer[]
  allowPublicSharing: boolean
}

export default function CaregiverCheerCard({ athleteId, athleteFirstName, athleteName, cheersToday, sentCheers, allowPublicSharing }: Props) {
  return (
    <div className="bg-white border border-amber-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2.5">Send encouragement</p>

      <CheerBox
        athleteId={athleteId}
        athleteFirstName={athleteFirstName}
        cheersToday={cheersToday}
      />

      {sentCheers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Your cheers</p>
          <div className="space-y-1.5">
            {sentCheers.map(c => (
              <div key={c.id} className="bg-amber-50/40 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-amber-800 truncate">&ldquo;{c.message}&rdquo;</p>
                  <p className="text-[10px] text-amber-400">{formatDate(c.created_at)}</p>
                </div>
                {c.viewed_at ? (
                  <span className="text-[10px] text-teal-600 font-medium flex-shrink-0 ml-2">
                    Seen &#10003;
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 flex-shrink-0 ml-2">
                    Sent
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allowPublicSharing && (
        <div className="mt-3 pt-3 border-t border-amber-100">
          <CaregiverSharingControl
            athleteId={athleteId}
            athleteName={athleteName}
          />
        </div>
      )}
    </div>
  )
}
