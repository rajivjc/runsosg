/**
 * Compact feel-trend visualisation — tiny vertical bars, colour-coded by rating.
 *
 * 4-5 → green (success), 3 → amber (warning), 1-2 → red (danger).
 * Renders inline at the right side of an athlete status card.
 */

type Props = {
  ratings: number[]
}

function barColor(rating: number): string {
  if (rating >= 4) return 'var(--color-success)'
  if (rating === 3) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export default function FeelTrendBars({ ratings }: Props) {
  if (ratings.length === 0) return null

  return (
    <div
      className="flex items-end gap-[2px]"
      aria-label={`Feel trend: ${ratings.join(', ')}`}
    >
      {ratings.map((r, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 6,
            height: 16,
            backgroundColor: barColor(r),
          }}
        />
      ))}
    </div>
  )
}
