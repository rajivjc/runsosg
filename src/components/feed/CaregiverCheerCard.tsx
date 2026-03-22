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
    <div className="bg-surface border border-amber-100 dark:border-amber-400/20 rounded-xl px-4 py-4 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-3">
        Send encouragement
      </p>

      <CheerBox
        athleteId={athleteId}
        athleteFirstName={athleteFirstName}
        cheersToday={cheersToday}
      />

      {sentCheers.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-border-subtle">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Your cheers</p>
          <div className="space-y-2">
            {sentCheers.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-secondary">&ldquo;{c.message}&rdquo;</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{formatDate(c.created_at)}</p>
                </div>
                {c.viewed_at ? (
                  <span className="text-[10px] text-teal-600 dark:text-teal-300 font-medium flex-shrink-0 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                    Seen &#10003;
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted flex-shrink-0 bg-surface-alt px-2 py-0.5 rounded-full">
                    Sent
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allowPublicSharing && (
        <div className="mt-3.5 pt-3.5 border-t border-border-subtle">
          <CaregiverSharingControl
            athleteId={athleteId}
            athleteName={athleteName}
          />
        </div>
      )}
    </div>
  )
}
