'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import AthleteCard, { type AthleteCardProps, isInactive } from './AthleteCard'

type AthleteSearchProps = {
  athletes: AthleteCardProps[]
}

const LEGEND_DISMISSED_KEY = 'avatar-legend-dismissed'

export default function AthleteSearch({ athletes }: AthleteSearchProps) {
  const [query, setQuery] = useState('')
  const [legendDismissed, setLegendDismissed] = useState(true)

  const hasAnyAvatar = athletes.some(a => a.avatar)

  useEffect(() => {
    if (hasAnyAvatar) {
      setLegendDismissed(localStorage.getItem(LEGEND_DISMISSED_KEY) === 'true')
    }
  }, [hasAnyAvatar])

  const dismissLegend = () => {
    setLegendDismissed(true)
    localStorage.setItem(LEGEND_DISMISSED_KEY, 'true')
  }

  const filtered =
    query.trim() === ''
      ? athletes
      : athletes.filter((a) =>
          a.name.toLowerCase().includes(query.toLowerCase())
        )

  return (
    <div>
      <div className="relative mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search athletes..."
          className="block w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 pr-10 text-sm placeholder-text-hint focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:bg-surface focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] transition-all duration-200 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-hint hover:text-text-secondary p-0.5 rounded-full hover:bg-surface-alt transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.some((a) => isInactive(a.lastSessionDate)) && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 flex-shrink-0" />
          <span className="text-xs text-text-muted">Highlighted athletes have not run in the past 2 weeks</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-text-hint text-center py-8">
          No athletes match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((athlete, i) => (
            <div key={athlete.id} className="animate-list-item" style={{ animationDelay: `${i * 50}ms` }}>
              <AthleteCard {...athlete} />
            </div>
          ))}
        </div>
      )}

      {hasAnyAvatar && !legendDismissed && (
        <div className="flex items-center justify-between mt-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-400/20 text-xs text-amber-700 dark:text-amber-300">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-50 dark:bg-amber-900/20 border-[1.5px] border-amber-200 dark:border-amber-400/20 flex items-center justify-center text-[8px] leading-none">✌️</span>
            Avatar chosen by athlete
          </span>
          <button
            onClick={dismissLegend}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 p-0.5 rounded transition-colors"
            aria-label="Dismiss legend"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
