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
      <div className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 px-4 py-3 mb-4 text-center rounded-[10px] border border-emerald-200 dark:border-emerald-400/20">
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
      bgClass: 'bg-red-100 dark:bg-red-900/25',
      borderClass: 'border border-red-200 dark:border-red-400/20',
      numberClass: 'text-red-600 dark:text-red-300',
      labelClass: 'text-red-800 dark:text-red-300',
    },
    {
      count: goingQuietCount,
      label: 'Going quiet',
      bgClass: 'bg-amber-100 dark:bg-amber-900/25',
      borderClass: 'border border-amber-200 dark:border-amber-400/20',
      numberClass: 'text-amber-600 dark:text-amber-300',
      labelClass: 'text-amber-800 dark:text-amber-300',
    },
    {
      count: nearMilestoneCount,
      label: 'Near milestone',
      bgClass: 'bg-blue-100 dark:bg-blue-900/25',
      borderClass: 'border border-blue-200 dark:border-blue-400/20',
      numberClass: 'text-blue-600 dark:text-blue-300',
      labelClass: 'text-blue-800 dark:text-blue-300',
    },
    {
      count: onTrackCount,
      label: 'On track',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/25',
      borderClass: 'border border-emerald-200 dark:border-emerald-400/20',
      numberClass: 'text-emerald-600 dark:text-emerald-300',
      labelClass: 'text-emerald-800 dark:text-emerald-300',
    },
  ]

  return (
    <div className="flex gap-1.5 mb-4">
      {counters.map((c) => (
        <div
          key={c.label}
          className={`flex-1 ${c.bgClass} ${c.borderClass} py-2.5 px-1 text-center rounded-[10px]`}
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
