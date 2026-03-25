'use client'

import { Search } from 'lucide-react'

export type FilterType = 'all' | 'has' | 'empty' | 'lt3'

interface CoachFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  filter: FilterType
  onFilterChange: (filter: FilterType) => void
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'has', label: 'Has athletes' },
  { id: 'empty', label: 'No athletes' },
  { id: 'lt3', label: '< 3 athletes' },
]

export default function CoachFilterBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: CoachFilterBarProps) {
  return (
    <div>
      {/* Search */}
      <div className="relative mt-2">
        <Search
          size={14}
          className="absolute left-2.5 top-2.5 text-text-hint"
        />
        <input
          type="text"
          placeholder="Filter coaches..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface py-2 pr-2.5 pl-8 text-[13px] text-text-primary outline-none"
        />
      </div>

      {/* Quick filters */}
      <div className="mt-2 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
              filter === f.id
                ? 'border-accent bg-accent-bg text-accent'
                : 'border-border bg-surface text-text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
