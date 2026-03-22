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
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-emerald-600 dark:text-emerald-400',
}

export default function PriorityBucket({ variant, label, children, isFirst }: Props) {
  return (
    <section className={isFirst ? 'mb-3' : 'mb-3'}>
      <h3
        className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${VARIANT_COLORS[variant]} ${isFirst ? '' : 'mt-5'}`}
      >
        {label}
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}
