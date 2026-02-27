'use client'

import { useState } from 'react'
import { toggleMilestoneDefinitionActive, updateMilestoneDefinition } from '@/app/admin/milestones/actions'

type MilestoneDefinitionRowProps = {
  id: string
  label: string
  icon: string | null
  type: 'automatic' | 'manual'
  condition: { metric?: string; threshold?: number } | null
  active: boolean
  displayOrder: number
}

const METRIC_LABELS: Record<string, string> = {
  session_count: 'Sessions',
  distance_km: 'Distance (km)',
  longest_run: 'Longest run',
}

export default function MilestoneDefinitionRow({
  id,
  label,
  icon,
  type,
  condition,
  active,
  displayOrder,
}: MilestoneDefinitionRowProps) {
  const [isActive, setIsActive] = useState(active)
  const [toggling, setToggling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(label)
  const [editIcon, setEditIcon] = useState(icon ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setToggling(true)
    setError(null)
    const { error } = await toggleMilestoneDefinitionActive(id, !isActive)
    setToggling(false)
    if (error) { setError(error); return }
    setIsActive(!isActive)
  }

  async function handleSave() {
    if (!editLabel.trim()) { setError('Label is required.'); return }
    setSaving(true)
    setError(null)
    const { error } = await updateMilestoneDefinition(id, {
      label: editLabel.trim(),
      icon: editIcon.trim() || undefined,
    })
    setSaving(false)
    if (error) { setError(error); return }
    setEditing(false)
  }

  return (
    <div className={`px-4 py-3 bg-white ${!isActive ? 'opacity-60' : ''}`}>
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{icon ?? '🏆'}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{type}</span>
                {condition?.metric && (
                  <span className="text-xs text-gray-500">
                    {METRIC_LABELS[condition.metric] ?? condition.metric} &ge; {condition.threshold}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {toggling ? '...' : isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[3rem_1fr] gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Icon</label>
              <input
                type="text"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                maxLength={4}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-center text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Label</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditLabel(label); setEditIcon(icon ?? ''); setError(null) }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!editing && error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
