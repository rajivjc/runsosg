'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, Check, Plus, Minus } from 'lucide-react'
import { compressPhoto } from '@/lib/media-client'
import { createManualSession } from '@/app/athletes/[id]/actions'

/** Sanitize a blob URL — only allow the blob: scheme to prevent XSS. */
function sanitizeBlobUrl(url: string): string {
  const parsed = new URL(url)
  if (parsed.protocol !== 'blob:') return ''
  return parsed.href
}

type Feel = 1 | 2 | 3 | 4 | 5

const FEEL_OPTIONS: { value: Feel; emoji: string; label: string }[] = [
  { value: 1, emoji: '😰', label: 'Very hard' },
  { value: 2, emoji: '😐', label: 'Hard' },
  { value: 3, emoji: '🙂', label: 'OK' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Great' },
]

export type AssignedAthlete = {
  id: string
  name: string
  avatar: string | null
}

type AthleteEntry = {
  athleteId: string
  name: string
  avatar: string | null
  selected: boolean
  distanceKm: string
  durationMinutes: string
  feel: Feel | null
  note: string
  photoFile: File | null
  photoPreview: string | null
}

type AllAthlete = {
  id: string
  name: string
  avatar: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  trainingSessionId: string
  sessionDate: string // YYYY-MM-DD
  assignedAthletes: AssignedAthlete[]
  allAthletes?: AllAthlete[]
}

export default function GroupLogRunSheet({
  isOpen,
  onClose,
  onSaved,
  trainingSessionId,
  sessionDate,
  assignedAthletes,
  allAthletes,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddAthlete, setShowAddAthlete] = useState(false)

  const [entries, setEntries] = useState<AthleteEntry[]>(() =>
    assignedAthletes.map(a => ({
      athleteId: a.id,
      name: a.name,
      avatar: a.avatar,
      selected: true,
      distanceKm: '',
      durationMinutes: '',
      feel: null,
      note: '',
      photoFile: null,
      photoPreview: null,
    }))
  )

  // Reset entries when assignedAthletes changes (new session opened)
  useEffect(() => {
    if (isOpen) {
      setEntries(
        assignedAthletes.map(a => ({
          athleteId: a.id,
          name: a.name,
          avatar: a.avatar,
          selected: true,
          distanceKm: '',
          durationMinutes: '',
          feel: null,
          note: '',
          photoFile: null,
          photoPreview: null,
        }))
      )
      setError(null)
      setSaving(false)
      setShowAddAthlete(false)
    }
  }, [isOpen, assignedAthletes])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true))
      setClosing(false)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const animateClose = useCallback(() => {
    setClosing(true)
    setVisible(false)
    setTimeout(() => {
      setClosing(false)
      // Clean up photo previews
      for (const e of entries) {
        if (e.photoPreview) URL.revokeObjectURL(e.photoPreview)
      }
      onClose()
    }, 300)
  }, [onClose, entries])

  if (!isOpen && !closing) return null

  function updateEntry(athleteId: string, update: Partial<AthleteEntry>) {
    setEntries(prev => prev.map(e =>
      e.athleteId === athleteId ? { ...e, ...update } : e
    ))
  }

  function toggleAthlete(athleteId: string) {
    setEntries(prev => prev.map(e =>
      e.athleteId === athleteId ? { ...e, selected: !e.selected } : e
    ))
  }

  function addAthlete(athlete: AllAthlete) {
    if (entries.some(e => e.athleteId === athlete.id)) {
      // Already in list — just select them
      updateEntry(athlete.id, { selected: true })
    } else {
      setEntries(prev => [...prev, {
        athleteId: athlete.id,
        name: athlete.name,
        avatar: athlete.avatar,
        selected: true,
        distanceKm: '',
        durationMinutes: '',
        feel: null,
        note: '',
        photoFile: null,
        photoPreview: null,
      }])
    }
    setShowAddAthlete(false)
  }

  async function handlePhotoSelect(athleteId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressPhoto(file)
      updateEntry(athleteId, {
        photoFile: compressed,
        photoPreview: URL.createObjectURL(compressed),
      })
    } catch {
      updateEntry(athleteId, {
        photoFile: file,
        photoPreview: URL.createObjectURL(file),
      })
    }
  }

  function removePhoto(athleteId: string) {
    const entry = entries.find(e => e.athleteId === athleteId)
    if (entry?.photoPreview) URL.revokeObjectURL(entry.photoPreview)
    updateEntry(athleteId, { photoFile: null, photoPreview: null })
  }

  async function handleSubmit() {
    const selected = entries.filter(e => e.selected)
    if (selected.length === 0) {
      setError('Select at least one athlete')
      return
    }

    // Validate all selected entries
    for (const entry of selected) {
      const dist = parseFloat(entry.distanceKm)
      const dur = parseInt(entry.durationMinutes)
      if (isNaN(dist) || dist <= 0) {
        setError(`Distance is required for ${entry.name}`)
        return
      }
      if (isNaN(dur) || dur <= 0) {
        setError(`Duration is required for ${entry.name}`)
        return
      }
    }

    setSaving(true)
    setError(null)

    // Auto-populate title based on time of day
    const hour = new Date().getHours()
    const defaultTitle = hour < 12 ? 'Morning Run' : hour < 17 ? 'Afternoon Run' : 'Evening Run'

    const errors: string[] = []
    for (const entry of selected) {
      const formData = new FormData()
      formData.set('date', sessionDate)
      formData.set('title', defaultTitle)
      formData.set('distance_km', entry.distanceKm)
      formData.set('duration_minutes', entry.durationMinutes)
      formData.set('training_session_id', trainingSessionId)
      if (entry.feel) formData.set('feel', String(entry.feel))
      if (entry.note.trim()) formData.set('note', entry.note)
      if (entry.photoFile) formData.set('photo', entry.photoFile)

      const result = await createManualSession(entry.athleteId, formData)
      if (result.error) {
        errors.push(`${entry.name}: ${result.error}`)
      }
    }

    setSaving(false)
    if (errors.length > 0) {
      setError(errors.join('. '))
      return
    }

    onSaved()
    animateClose()
  }

  const selectedCount = entries.filter(e => e.selected).length

  // Athletes available to add (not already in the list)
  const availableToAdd = (allAthletes ?? []).filter(
    a => !entries.some(e => e.athleteId === a.id)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => !saving && animateClose()}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-50 max-w-2xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h2 className="text-base font-semibold text-text-primary mb-1 text-center">Log Runs</h2>
          <p className="text-xs text-text-muted text-center mb-5">
            Session on {sessionDate}
          </p>

          {/* Athlete entries */}
          <div className="space-y-4">
            {entries.map(entry => (
              <AthleteEntryForm
                key={entry.athleteId}
                entry={entry}
                onToggle={() => toggleAthlete(entry.athleteId)}
                onUpdate={(update) => updateEntry(entry.athleteId, update)}
                onPhotoSelect={(e) => handlePhotoSelect(entry.athleteId, e)}
                onRemovePhoto={() => removePhoto(entry.athleteId)}
                disabled={saving}
              />
            ))}
          </div>

          {/* Add athlete */}
          {availableToAdd.length > 0 && (
            <div className="mt-4">
              {showAddAthlete ? (
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                    Add an athlete
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {availableToAdd.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => addAthlete(a)}
                        className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-md hover:bg-accent-bg text-sm text-text-primary min-h-[44px]"
                      >
                        <span className="text-base">{a.avatar ?? '🏃'}</span>
                        {a.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAthlete(false)}
                    className="text-xs text-text-muted mt-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddAthlete(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover min-h-[44px]"
                >
                  <Plus size={16} />
                  Add athlete
                </button>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-300 mt-3">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => !saving && animateClose()}
              disabled={saving}
              className="text-sm text-text-muted px-3 py-2 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || selectedCount === 0}
              className="bg-accent hover:bg-accent-hover active:scale-[0.97] disabled:opacity-60 text-white text-sm font-bold rounded-lg px-5 py-2.5 transition-all duration-150 min-h-[44px]"
            >
              {saving ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                `Save ${selectedCount} run${selectedCount !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Per-athlete form entry ──────────────────────────────────────────

function AthleteEntryForm({
  entry,
  onToggle,
  onUpdate,
  onPhotoSelect,
  onRemovePhoto,
  disabled,
}: {
  entry: AthleteEntry
  onToggle: () => void
  onUpdate: (update: Partial<AthleteEntry>) => void
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: () => void
  disabled: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setCompressing(true)
    await onPhotoSelect(e)
    setCompressing(false)
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${entry.selected ? 'border-accent/30 bg-accent-bg/30' : 'border-border-subtle bg-surface-alt/30'}`}>
      {/* Athlete header with toggle */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left min-h-[44px]"
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${entry.selected ? 'bg-accent border-accent' : 'border-border bg-surface'}`}>
          {entry.selected && <Check size={12} className="text-white" />}
        </div>
        <span className="text-base leading-none">{entry.avatar ?? '🏃'}</span>
        <span className="text-sm font-bold text-text-primary">{entry.name}</span>
      </button>

      {/* Expandable form fields */}
      {entry.selected && (
        <div className="px-3 pb-3 space-y-3">
          {/* Distance and Duration */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-0.5">
                Distance (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entry.distanceKm}
                onChange={e => onUpdate({ distanceKm: e.target.value })}
                placeholder="e.g. 3.5"
                disabled={disabled}
                className="w-full border border-border-strong rounded-lg px-2.5 py-1.5 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-0.5">
                Duration (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={entry.durationMinutes}
                onChange={e => onUpdate({ durationMinutes: e.target.value })}
                placeholder="e.g. 30"
                disabled={disabled}
                className="w-full border border-border-strong rounded-lg px-2.5 py-1.5 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
              />
            </div>
          </div>

          {/* Feel */}
          <div>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
              How did it feel?
            </p>
            <div className="flex gap-1.5">
              {FEEL_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onUpdate({ feel: entry.feel === value ? null : value })}
                  disabled={disabled}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-xl transition-all duration-200 ${
                    entry.feel === value
                      ? 'bg-teal-50 dark:bg-teal-900/10 ring-2 ring-teal-400 scale-105'
                      : 'bg-surface border border-border hover:bg-surface-raised active:scale-95'
                  }`}
                  aria-label={label}
                  aria-pressed={entry.feel === value}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-0.5">
              Note
            </label>
            <textarea
              rows={1}
              value={entry.note}
              onChange={e => onUpdate({ note: e.target.value })}
              placeholder="How did the run go?"
              disabled={disabled}
              className="w-full border border-border-strong rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>

          {/* Photo */}
          <div>
            {entry.photoPreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sanitizeBlobUrl(entry.photoPreview)}
                  alt="Photo preview"
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  disabled={disabled}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || compressing}
                className="flex items-center gap-1.5 bg-surface-raised hover:bg-surface-alt border border-border text-text-secondary text-xs rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Camera size={14} />
                {compressing ? 'Compressing...' : 'Photo'}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  )
}
