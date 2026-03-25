'use client'

import { Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

interface UnassignedAthlete {
  id: string
  name: string
}

interface AthletePickerSheetProps {
  open: boolean
  onClose: () => void
  coachName: string
  unassignedAthletes: UnassignedAthlete[]
  onSelect: (athlete: UnassignedAthlete) => void
}

export default function AthletePickerSheet({
  open,
  onClose,
  coachName,
  unassignedAthletes,
  onSelect,
}: AthletePickerSheetProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return unassignedAthletes
    const q = search.toLowerCase()
    return unassignedAthletes.filter((a) => a.name.toLowerCase().includes(q))
  }, [unassignedAthletes, search])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[201] mx-auto flex max-h-[65vh] max-w-[390px] flex-col rounded-t-2xl bg-surface shadow-[0_-4px_30px_rgba(0,0,0,0.15)]">
        {/* Drag handle */}
        <div className="flex justify-center py-2 pb-1">
          <div className="h-1 w-9 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
          <span className="text-[15px] font-bold text-text-primary">
            Add athlete to {coachName}
          </span>
          <button
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-alt"
            aria-label="Close"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={13}
              className="absolute left-2 top-[9px] text-text-hint"
            />
            <input
              type="text"
              placeholder="Search unassigned athletes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface py-2 pr-2 pl-7 text-[13px] text-text-primary outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-5 text-center text-[13px] text-text-hint">
              {unassignedAthletes.length === 0
                ? 'All athletes are assigned'
                : 'No matches found'}
            </div>
          ) : (
            filtered.map((athlete) => (
              <button
                key={athlete.id}
                onClick={() => {
                  onSelect(athlete)
                  setSearch('')
                }}
                className="flex min-h-[44px] w-full items-center justify-between border-b border-border-subtle bg-surface px-2.5 py-3 text-left"
              >
                <span className="text-sm font-semibold text-text-primary">
                  {athlete.name}
                </span>
                <Plus size={16} className="text-accent" />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
