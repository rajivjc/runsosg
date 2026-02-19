'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type QuickLogSheetProps = {
  sessionId: string | null
  athleteId: string
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

type Feel = 1 | 2 | 3 | 4 | 5

const FEEL_OPTIONS: { value: Feel; emoji: string; label: string }[] = [
  { value: 1, emoji: '😰', label: 'Very hard' },
  { value: 2, emoji: '😐', label: 'Hard' },
  { value: 3, emoji: '🙂', label: 'OK' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Great' },
]

export default function QuickLogSheet({
  sessionId,
  athleteId,
  isOpen,
  onClose,
  onSaved,
}: QuickLogSheetProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedFeel, setSelectedFeel] = useState<Feel | null>(null)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  function handleSelectFeel(feel: Feel) {
    setSelectedFeel(feel)
    setStep(2)
  }

  async function handleSave(skipNote = false) {
    if (!sessionId || selectedFeel == null) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('sessions')
      .update({ feel: selectedFeel, note: skipNote ? undefined : noteText || undefined })
      .eq('id', sessionId)
    setSaving(false)
    if (error) {
      setSaveError('Could not save. Please try again.')
      return
    }
    resetState()
    onSaved()
  }

  function resetState() {
    setStep(1)
    setSelectedFeel(null)
    setNoteText('')
    setSaveError(null)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-6 max-w-2xl mx-auto shadow-2xl">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

        {sessionId == null ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">
              No session to log against. Run a session with Strava first.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 text-teal-600 text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : step === 1 ? (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 text-center">
              How did the run feel?
            </h2>
            <div className="flex justify-center gap-2">
              {FEEL_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => handleSelectFeel(value)}
                  className={`text-3xl p-2 rounded-xl transition-all ${
                    selectedFeel === value
                      ? 'bg-teal-50 ring-2 ring-teal-400'
                      : 'hover:bg-gray-50'
                  }`}
                  aria-label={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4 text-center">
              Add a note (optional)
            </h2>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="How did it go?"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {saveError && (
              <p className="text-sm text-red-600 mt-2" role="alert">{saveError}</p>
            )}
            <div className="flex justify-end gap-3 mt-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="text-gray-500 text-sm disabled:opacity-50"
              >
                Skip
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
