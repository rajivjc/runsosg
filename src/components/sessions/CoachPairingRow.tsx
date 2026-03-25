'use client'

import { Plus, X } from 'lucide-react'

interface AssignedAthlete {
  id: string
  name: string
  tag: 'regular' | 'suggested' | null
}

interface CoachPairingRowProps {
  coachId: string
  coachName: string
  athletes: AssignedAthlete[]
  maxAthletes: number
  onAddClick: (coachId: string) => void
  onRemoveClick: (coachId: string, athleteId: string) => void
}

function TagBadge({ tag }: { tag: 'regular' | 'suggested' | null }) {
  if (!tag) return null
  const isRegular = tag === 'regular'
  return (
    <span
      className={`rounded px-1.5 py-px text-[10px] font-semibold ${
        isRegular
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-sky-100 text-sky-700'
      }`}
    >
      {tag}
    </span>
  )
}

export default function CoachPairingRow({
  coachId,
  coachName,
  athletes,
  maxAthletes,
  onAddClick,
  onRemoveClick,
}: CoachPairingRowProps) {
  const isFull = athletes.length >= maxAthletes

  return (
    <div className="mb-2 rounded-[10px] border border-border-subtle bg-surface p-2.5 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Coach header */}
      <div
        className={`flex items-center justify-between ${
          athletes.length > 0 ? 'mb-2' : ''
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              isFull
                ? 'bg-emerald-500'
                : athletes.length > 0
                  ? 'bg-amber-500'
                  : 'bg-gray-300'
            }`}
          />
          <span className="text-sm font-bold text-text-primary">
            {coachName}
          </span>
          <span className="text-[11px] text-text-hint">
            {athletes.length}/{maxAthletes}
          </span>
        </div>
        {!isFull && (
          <button
            onClick={() => onAddClick(coachId)}
            className="flex min-h-[44px] items-center gap-1 rounded-md border border-teal-200 bg-accent-bg px-2.5 py-1 text-xs font-semibold text-accent"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {/* Assigned athletes */}
      {athletes.length > 0 && (
        <div className="flex flex-col gap-1">
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between rounded-md bg-surface-alt px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-text-primary">
                  {athlete.name}
                </span>
                <TagBadge tag={athlete.tag} />
              </div>
              <button
                onClick={() => onRemoveClick(coachId, athlete.id)}
                className="flex h-6 w-6 min-h-[44px] min-w-[44px] items-center justify-center rounded text-text-hint"
                aria-label={`Remove ${athlete.name} from ${coachName}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {athletes.length === 0 && (
        <p className="mt-1 text-xs italic text-text-hint">
          No athletes assigned
        </p>
      )}
    </div>
  )
}
