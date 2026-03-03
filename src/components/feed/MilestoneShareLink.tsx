'use client'

import Link from 'next/link'

export default function MilestoneShareLink({ milestoneId }: { milestoneId: string }) {
  return (
    <Link
      href={`/milestone/${milestoneId}`}
      className="ml-0.5 text-amber-400 hover:text-amber-600"
      title="Share this milestone"
      onClick={(e) => e.stopPropagation()}
    >
      ↗
    </Link>
  )
}
