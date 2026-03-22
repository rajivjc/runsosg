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
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors min-h-[44px]"
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--color-success)' }}
          />
          {a.athleteName}
        </Link>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full px-3 py-2 text-xs font-medium bg-gray-100 text-gray-500 min-h-[44px]">
          +{overflow} more
        </span>
      )}
    </div>
  )
}
