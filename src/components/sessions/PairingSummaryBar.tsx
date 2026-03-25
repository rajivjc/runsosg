'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'

interface PairingSummaryBarProps {
  coachCount: number
  totalAthletes: number
  unassignedCount: number
}

export default function PairingSummaryBar({
  coachCount,
  totalAthletes,
  unassignedCount,
}: PairingSummaryBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-alt px-2.5 py-2 text-xs font-semibold">
      <span className="text-text-secondary">{coachCount} coaches</span>
      <span className="text-text-hint">·</span>
      <span className="text-text-secondary">{totalAthletes} athletes</span>
      <span className="text-text-hint">·</span>
      {unassignedCount > 0 ? (
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle size={12} /> {unassignedCount} unassigned
        </span>
      ) : (
        <span className="flex items-center gap-1 text-teal-700">
          <CheckCircle size={12} /> All assigned
        </span>
      )}
    </div>
  )
}
