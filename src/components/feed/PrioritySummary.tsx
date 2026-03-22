/**
 * Summary counters strip for the coach feed priority section.
 *
 * Shows 4 compact metric cards (attention / quiet / milestone / on track),
 * or collapses to a single "All N athletes on track" line when there are
 * no athletes needing attention.
 */

type Props = {
  needsAttentionCount: number
  goingQuietCount: number
  nearMilestoneCount: number
  onTrackCount: number
  totalAthletes: number
}

export default function PrioritySummary({
  needsAttentionCount,
  goingQuietCount,
  nearMilestoneCount,
  onTrackCount,
  totalAthletes,
}: Props) {
  const allOnTrack =
    needsAttentionCount === 0 &&
    goingQuietCount === 0 &&
    nearMilestoneCount === 0

  if (allOnTrack) {
    return (
      <div
        className="rounded-xl px-4 py-3 mb-4 text-center"
        style={{
          backgroundColor: 'var(--color-success-light)',
          color: 'var(--color-success)',
        }}
      >
        <p className="text-sm font-semibold">
          All {totalAthletes} athletes on track
        </p>
      </div>
    )
  }

  const counters = [
    {
      count: needsAttentionCount,
      label: 'Needs attention',
      bg: 'var(--color-danger-light)',
      text: 'var(--color-danger)',
    },
    {
      count: goingQuietCount,
      label: 'Going quiet',
      bg: 'var(--color-warning-light)',
      text: 'var(--color-warning)',
    },
    {
      count: nearMilestoneCount,
      label: 'Near milestone',
      bg: 'var(--color-info-light)',
      text: 'var(--color-info)',
    },
    {
      count: onTrackCount,
      label: 'On track',
      bg: 'var(--color-success-light)',
      text: 'var(--color-success)',
    },
  ]

  return (
    <div className="flex gap-2 mb-4">
      {counters.map((c) => (
        <div
          key={c.label}
          className="flex-1 rounded-xl px-3 py-2.5 text-center"
          style={{ backgroundColor: c.bg }}
        >
          <p
            className="text-xl font-bold leading-tight"
            style={{ color: c.text }}
          >
            {c.count}
          </p>
          <p
            className="text-[11px] leading-tight mt-0.5"
            style={{ color: c.text, opacity: 0.8 }}
          >
            {c.label}
          </p>
        </div>
      ))}
    </div>
  )
}
