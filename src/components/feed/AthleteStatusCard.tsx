/**
 * Individual athlete status card used in needs-attention, going-quiet,
 * and near-milestone priority buckets.
 *
 * Entire card is a link to the athlete detail page. Left border accent
 * and background tint match the variant colour.
 */

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
    bg: 'var(--color-danger-light)',
    border: 'var(--color-danger)',
  },
  warning: {
    bg: 'var(--color-warning-light)',
    border: 'var(--color-warning)',
  },
  info: {
    bg: 'var(--color-info-light)',
    border: 'var(--color-info)',
  },
}

export default function AthleteStatusCard({
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
      className="block rounded-xl min-h-[44px]"
      style={{
        backgroundColor: styles.bg,
        borderLeft: `3px solid ${styles.border}`,
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-lg">
          {avatar ?? '🏃'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {athleteName}
          </p>
          <p className="text-xs text-gray-600 truncate">{detail}</p>
        </div>
        {rightContent && (
          <div className="flex-shrink-0">{rightContent}</div>
        )}
        <span className="text-gray-400 flex-shrink-0 text-sm">&#x203A;</span>
      </div>
    </Link>
  )
}
