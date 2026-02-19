'use client'

import { useState } from 'react'
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
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search athletes..."
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No athletes match your search
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((athlete) => (
            <AthleteCard key={athlete.id} {...athlete} />
          ))}
        </div>
      )}
    </div>
  )
}
