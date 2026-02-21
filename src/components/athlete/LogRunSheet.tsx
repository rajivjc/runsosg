'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

type Feel = 1 | 2 | 3 | 4 | 5

const FEEL_OPTIONS: { value: Feel; emoji: string; label: string }[] = [
  { value: 1, emoji: '😰', label: 'Very hard' },
  { value: 2, emoji: '😐', label: 'Hard' },
  { value: 3, emoji: '🙂', label: 'OK' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Great' },
]

type Props = {
  athleteId: string
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  createSession: (athleteId: string, formData: FormData) => Promise<{ error?: string }>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
    >
      {pending ? 'Saving…' : 'Save run'}
    </button>
  )
}

export default function LogRunSheet({ athleteId, isOpen, onClose, onSaved, createSession }: Props) {
  const [selectedFeel, setSelectedFeel] = useState<Feel | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleAction(formData: FormData) {
    if (selectedFeel) formData.set('feel', String(selectedFeel))
    setError(null)
    const result = await createSession(athleteId, formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setSelectedFeel(null)
    onSaved()
  }

  function handleClose() {
    setSelectedFeel(null)
    setError(null)
    onClose()
  }

  // Default date to today in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-w-2xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h2 className="text-base font-semibold text-gray-900 mb-5 text-center">Log a run</h2>

          <form action={handleAction} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={today}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Distance and Duration side by side */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Distance (km)
                </label>
                <input
                  type="number"
                  name="distance_km"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 3.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  min="0"
                  placeholder="e.g. 30"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Feel */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                How did it feel? <span className="font-normal normal-case">(optional)</span>
              </p>
              <div className="flex gap-2">
                {FEEL_OPTIONS.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedFeel(value)}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl text-2xl transition-all ${
                      selectedFeel === value
                        ? 'bg-teal-50 ring-2 ring-teal-400'
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                    aria-label={label}
                    aria-pressed={selectedFeel === value}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Note <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                name="note"
                rows={2}
                placeholder="How did the run go? Any observations…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-500 px-3 py-2"
              >
                Cancel
              </button>
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
