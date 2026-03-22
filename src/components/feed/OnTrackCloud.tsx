/**
 * Compressed pill cloud for on-track athletes.
 *
 * Renders name pills linking to each athlete's detail page, with a
 * "+N more" overflow pill when the count exceeds maxVisible.
 */

import Link from 'next/link'

type Athlete = {
  athleteId: string
  athleteName: string
  avatar: string | null
}

type Props = {
  athletes: Athlete[]
  maxVisible?: number
}

export default function OnTrackCloud({ athletes, maxVisible = 8 }: Props) {
  const visible = athletes.slice(0, maxVisible)
  const overflow = athletes.length - visible.length

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => (
        <Link
          key={a.athleteId}
          href={`/athletes/${a.athleteId}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-[13px] font-medium text-text-primary hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors min-h-[44px] px-3.5 py-2 border border-green-200 dark:border-green-400/20"
        >
          <span className="flex-shrink-0 w-[7px] h-[7px] rounded-full bg-green-600 dark:bg-green-400" />
          {a.athleteName}
        </Link>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-surface-alt text-[13px] font-medium text-text-muted min-h-[44px] px-3.5 py-2 border border-border">
          +{overflow} more
        </span>
      )}
    </div>
  )
}
