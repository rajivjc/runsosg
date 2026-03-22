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
        className="bg-emerald-100 text-emerald-600 px-4 py-3 mb-4 text-center"
        style={{ borderRadius: '10px', border: '0.5px solid #A7F3D0' }}
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
      bgClass: 'bg-red-100',
      borderColor: '#FECACA',
      numberClass: 'text-red-600',
      labelClass: 'text-red-800',
    },
    {
      count: goingQuietCount,
      label: 'Going quiet',
      bgClass: 'bg-amber-100',
      borderColor: '#FDE68A',
      numberClass: 'text-amber-600',
      labelClass: 'text-amber-800',
    },
    {
      count: nearMilestoneCount,
      label: 'Near milestone',
      bgClass: 'bg-blue-100',
      borderColor: '#BFDBFE',
      numberClass: 'text-blue-600',
      labelClass: 'text-blue-800',
    },
    {
      count: onTrackCount,
      label: 'On track',
      bgClass: 'bg-emerald-100',
      borderColor: '#A7F3D0',
      numberClass: 'text-emerald-600',
      labelClass: 'text-emerald-800',
    },
  ]

  return (
    <div className="flex gap-1.5 mb-4">
      {counters.map((c) => (
        <div
          key={c.label}
          className={`flex-1 ${c.bgClass} py-2.5 px-1 text-center`}
          style={{
            borderRadius: '10px',
            border: `0.5px solid ${c.borderColor}`,
          }}
        >
          <p
            className={`text-[22px] font-semibold leading-tight ${c.numberClass}`}
          >
            {c.count}
          </p>
          <p className={`text-[10px] leading-tight mt-px ${c.labelClass}`}>
            {c.label}
          </p>
        </div>
      ))}
    </div>
  )
}
