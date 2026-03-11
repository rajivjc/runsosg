'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useFormStatus } from 'react-dom'
import { Camera, X } from 'lucide-react'
import { compressPhoto } from '@/lib/media-client'

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
      className="bg-teal-600 hover:bg-teal-700 active:scale-[0.97] disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition-all duration-150"
    >
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving…
        </span>
      ) : 'Save run'}
    </button>
  )
}

export default function LogRunSheet({ athleteId, isOpen, onClose, onSaved, createSession }: Props) {
  const [selectedFeel, setSelectedFeel] = useState<Feel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Trigger enter animation on next frame
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
      setSelectedFeel(null)
      setError(null)
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      setPhotoFile(null)
      setPhotoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
    }, 300)
  }, [onClose, photoPreview])

  if (!isOpen && !closing) return null

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCompressing(true)
    try {
      const compressed = await compressPhoto(file)
      setPhotoFile(compressed)
      setPhotoPreview(URL.createObjectURL(compressed))
    } catch {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
    setCompressing(false)
  }

  function removePhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAction(formData: FormData) {
    if (selectedFeel) formData.set('feel', String(selectedFeel))
    if (photoFile) formData.set('photo', photoFile)
    setError(null)
    const result = await createSession(athleteId, formData)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved()
    animateClose()
  }

  function handleClose() {
    animateClose()
  }

  // Default date to today in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Auto-populate title based on time of day
  const hour = new Date().getHours()
  const defaultTitle = hour < 12 ? 'Morning Run' : hour < 17 ? 'Afternoon Run' : 'Evening Run'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-w-2xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <h2 className="text-base font-semibold text-gray-900 mb-5 text-center">Log a run</h2>

          <form action={handleAction} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Title <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                name="title"
                defaultValue={defaultTitle}
                placeholder="e.g. Sunday long run"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
              />
            </div>

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
                max={today}
                onKeyDown={(e) => e.preventDefault()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
              />
            </div>

            {/* Distance and Duration side by side */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Distance (km) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="distance_km"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 3.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Duration (mins) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  min="0"
                  required
                  placeholder="e.g. 30"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
                />
              </div>
            </div>

            {/* Heart Rate side by side */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Avg HR <span className="font-normal normal-case">(bpm, optional)</span>
                </label>
                <input
                  type="number"
                  name="avg_heart_rate"
                  min="30"
                  max="250"
                  placeholder="e.g. 145"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Max HR <span className="font-normal normal-case">(bpm, optional)</span>
                </label>
                <input
                  type="number"
                  name="max_heart_rate"
                  min="30"
                  max="250"
                  placeholder="e.g. 170"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
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
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl text-2xl transition-all duration-200 ${
                      selectedFeel === value
                        ? 'bg-teal-50 ring-2 ring-teal-400 scale-105'
                        : 'bg-white border border-gray-200 hover:bg-gray-50 active:scale-95'
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

            {/* Photo */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Photo <span className="font-normal normal-case">(optional)</span>
              </p>
              {photoPreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sanitizeBlobUrl(photoPreview)}
                    alt="Photo preview"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-sm rounded-lg px-3 py-2.5 transition-colors"
                >
                  <Camera size={16} />
                  {compressing ? 'Compressing…' : 'Add a photo'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
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
