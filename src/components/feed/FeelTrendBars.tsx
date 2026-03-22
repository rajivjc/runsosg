/**
 * Compact feel-trend visualisation — tiny vertical bars, colour-coded by rating.
 *
 * 4-5 → green (emerald-600), 3 → amber (amber-600), 1-2 → red (red-600).
 * Renders inline at the right side of an athlete status card.
 */

type Props = {
  ratings: number[]
}

function barColor(rating: number): string {
  if (rating >= 4) return '#059669'
  if (rating === 3) return '#D97706'
  return '#DC2626'
}

export default function FeelTrendBars({ ratings }: Props) {
  if (ratings.length === 0) return null

  return (
    <div
      className="flex items-center"
      style={{ gap: '3px' }}
      aria-label={`Feel trend: ${ratings.join(', ')}`}
    >
      {ratings.map((r, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 18,
            borderRadius: 2,
            backgroundColor: barColor(r),
          }}
        />
      ))}
    </div>
  )
}
