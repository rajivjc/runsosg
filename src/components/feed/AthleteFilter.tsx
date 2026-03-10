'use client'

interface Props {
  athletes: { id: string; name: string }[]
  selected: string | null
  onSelect: (athleteId: string | null) => void
}

export default function AthleteFilter({ athletes, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 min-h-[44px] px-4 rounded-full text-sm font-medium transition-colors ${
          selected === null
            ? 'bg-teal-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All
      </button>
      {athletes.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id === selected ? null : a.id)}
          className={`flex-shrink-0 min-h-[44px] px-4 rounded-full text-sm font-medium transition-colors ${
            selected === a.id
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {a.name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}
