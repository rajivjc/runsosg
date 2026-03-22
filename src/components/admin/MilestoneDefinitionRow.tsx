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
  const [editMetric, setEditMetric] = useState(condition?.metric ?? '')
  const [editThreshold, setEditThreshold] = useState(condition?.threshold?.toString() ?? '')
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
    const updates: { label: string; icon?: string; condition?: { metric: string; threshold: number } } = {
      label: editLabel.trim(),
      icon: editIcon.trim() || undefined,
    }
    if (type === 'automatic' && editMetric && editThreshold) {
      const threshold = parseFloat(editThreshold)
      if (isNaN(threshold) || threshold <= 0) { setSaving(false); setError('Threshold must be a positive number.'); return }
      if (!['session_count', 'distance_km', 'longest_run'].includes(editMetric)) { setSaving(false); setError('Invalid metric.'); return }
      updates.condition = { metric: editMetric, threshold: Math.round(threshold * 100) / 100 }
    }
    const { error } = await updateMilestoneDefinition(id, updates)
    setSaving(false)
    if (error) { setError(error); return }
    setEditing(false)
  }

  return (
    <div className={`px-4 py-3 bg-surface ${!isActive ? 'opacity-60' : ''}`}>
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">{icon ?? '🏆'}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] uppercase tracking-wide text-text-hint font-semibold">{type}</span>
                {condition?.metric && (
                  <span className="text-xs text-text-muted">
                    {METRIC_LABELS[condition.metric] ?? condition.metric} &ge; {condition.threshold}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 font-medium px-2 py-1 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100'
                  : 'bg-surface-alt text-text-muted hover:bg-surface-alt'
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
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Icon</label>
              <input
                type="text"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                maxLength={4}
                className="w-full border border-border rounded-lg px-2 py-2 text-center text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Label</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          {type === 'automatic' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Metric</label>
                <select
                  value={editMetric}
                  onChange={(e) => setEditMetric(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                >
                  <option value="session_count">Session count</option>
                  <option value="distance_km">Single-run distance (km)</option>
                  <option value="longest_run">Longest run (km)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Threshold</label>
                <input
                  type="number"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  min="0.01"
                  step={editMetric === 'session_count' ? '1' : '0.01'}
                  placeholder="e.g. 10"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setEditLabel(label); setEditIcon(icon ?? ''); setEditMetric(condition?.metric ?? ''); setEditThreshold(condition?.threshold?.toString() ?? ''); setError(null) }}
              className="text-xs text-text-muted hover:text-text-secondary px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!editing && error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>}
    </div>
  )
}
