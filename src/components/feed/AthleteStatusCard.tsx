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
    bg: '#FEF2F2',
    border: '#EF4444',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#F59E0B',
  },
  info: {
    bg: '#EFF6FF',
    border: '#3B82F6',
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
      className="block min-h-[44px]"
      style={{
        backgroundColor: styles.bg,
        borderLeft: `3px solid ${styles.border}`,
        borderRadius: '0 10px 10px 0',
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex-shrink-0 text-[22px]">
          {avatar ?? '🏃'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {athleteName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{detail}</p>
        </div>
        {rightContent && (
          <div className="flex-shrink-0">{rightContent}</div>
        )}
        <span className="text-gray-400 flex-shrink-0 text-lg">&#x203A;</span>
      </div>
    </Link>
  )
}
