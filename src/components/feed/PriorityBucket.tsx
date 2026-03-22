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
}

const VARIANT_COLORS: Record<Variant, string> = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  success: 'var(--color-success)',
}

export default function PriorityBucket({ variant, label, children }: Props) {
  return (
    <section className="mb-4">
      <h3
        className="text-[11px] font-bold uppercase tracking-widest mb-2"
        style={{ color: VARIANT_COLORS[variant] }}
      >
        {label}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
