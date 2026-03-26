/**
 * Individual athlete status card used in needs-attention, going-quiet,
 * and near-milestone priority buckets.
 *
 * Entire card is a link to the athlete detail page. Left border accent
 * and background tint match the variant colour.
 */

import { memo } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'

type Variant = 'danger' | 'warning' | 'info'

type Props = {
  athleteId: string
  athleteName: string
  avatar: string | null
  detail: string
  variant: Variant
  rightContent?: ReactNode
}

const VARIANT_STYLES: Record<Variant, { bg: string; border: string }> = {
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-l-[3px] border-l-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-l-[3px] border-l-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-l-[3px] border-l-blue-500',
  },
}

export default memo(function AthleteStatusCard({
  athleteId,
  athleteName,
  avatar,
  detail,
  variant,
  rightContent,
}: Props) {
  const styles = VARIANT_STYLES[variant]

  return (
    <Link
      href={`/athletes/${athleteId}`}
      className={`block min-h-[44px] ${styles.bg} ${styles.border} rounded-r-[10px]`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex-shrink-0 text-[22px]">
          {avatar ?? '🏃'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {athleteName}
          </p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{detail}</p>
        </div>
        {rightContent && (
          <div className="flex-shrink-0">{rightContent}</div>
        )}
        <span className="text-text-hint flex-shrink-0 text-lg">&#x203A;</span>
      </div>
    </Link>
  )
})
