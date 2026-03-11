'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import AthleteCard, { type AthleteCardProps } from './AthleteCard'

type AthleteSearchProps = {
  athletes: AthleteCardProps[]
}

export default function AthleteSearch({ athletes }: AthleteSearchProps) {
  const [query, setQuery] = useState('')

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
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] transition-all duration-200 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
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
    </div>
  )
}
