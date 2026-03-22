/**
 * Reusable section wrapper for a priority status bucket.
 *
 * Renders a coloured uppercase section header and wraps children in spacing.
 * Parent controls visibility — only render when the bucket is non-empty.
 */

import type { ReactNode } from 'react'

type Variant = 'danger' | 'warning' | 'info' | 'success'

type Props = {
  variant: Variant
  label: string
  children: ReactNode
  isFirst?: boolean
}

const VARIANT_COLORS: Record<Variant, string> = {
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
  success: '#059669',
}

export default function PriorityBucket({ variant, label, children, isFirst }: Props) {
  return (
    <section className={isFirst ? 'mb-3' : 'mb-3'}>
      <h3
        className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{
          color: VARIANT_COLORS[variant],
          letterSpacing: '0.5px',
          marginTop: isFirst ? '0' : '20px',
        }}
      >
        {label}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}
