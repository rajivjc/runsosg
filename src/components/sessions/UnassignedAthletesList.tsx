'use client'

import { AlertTriangle, CheckCircle, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

interface UnassignedAthlete {
  id: string
  name: string
}

interface UnassignedAthletesListProps {
  athletes: UnassignedAthlete[]
  onAssignClick: (athlete: UnassignedAthlete) => void
}

export default function UnassignedAthletesList({
  athletes,
  onAssignClick,
}: UnassignedAthletesListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return athletes
    const q = search.toLowerCase()
    return athletes.filter((a) => a.name.toLowerCase().includes(q))
  }, [athletes, search])

  const count = athletes.length

  return (
    <div
      className={`mx-3.5 mb-3.5 rounded-[10px] border p-3 ${
        count > 0
          ? 'border-amber-200 bg-amber-50'
          : 'border-emerald-200 bg-emerald-50'
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {count > 0 ? (
          <AlertTriangle size={14} className="text-amber-600" />
        ) : (
          <CheckCircle size={14} className="text-teal-700" />
        )}
        <span
          className={`text-[13px] font-bold ${
            count > 0 ? 'text-amber-900' : 'text-emerald-800'
          }`}
        >
          {count > 0
            ? `Unassigned Athletes (${count})`
            : 'All Athletes Assigned'}
        </span>
      </div>

      {count > 0 && (
        <>
          <div className="relative mb-2">
            <Search
              size={13}
              className="absolute left-2 top-2 text-text-hint"
            />
            <input
              type="text"
              placeholder="Search athletes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-amber-200 bg-surface py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none"
            />
          </div>

          {filtered.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between border-b border-amber-200/25 py-2"
            >
              <span className="text-sm font-semibold text-amber-900">
                {athlete.name}
              </span>
              <button
                onClick={() => onAssignClick(athlete)}
                className="flex min-h-[44px] items-center gap-1 rounded-md border-none bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white"
              >
                Assign <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
