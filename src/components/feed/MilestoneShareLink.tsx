'use client'

export default function MilestoneShareLink({ milestoneId }: { milestoneId: string }) {
  return (
    <span
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        window.open(`/milestone/${milestoneId}`, '_blank', 'noopener,noreferrer')
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
          e.preventDefault()
          window.open(`/milestone/${milestoneId}`, '_blank', 'noopener,noreferrer')
        }
      }}
      className="ml-0.5 text-amber-400 hover:text-amber-600 cursor-pointer"
      title="Share this milestone"
      aria-label="Share this milestone"
    >
      ↗
    </span>
  )
}
