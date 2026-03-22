'use client'

import { useFormStatus } from 'react-dom'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { setAthletePin } from '@/app/my/[athleteId]/actions'

type AthleteProfile = {
  id: string
  name: string
  date_of_birth: string | null
  running_goal: string | null
  goal_type: string | null
  goal_target: number | null
  communication_notes: string | null
  medical_notes: string | null
  emergency_contact: string | null
  allow_public_sharing?: boolean
  sharing_disabled_by_caregiver?: boolean
  caregiver_user_id?: string | null
}

type Props = {
  athlete: AthleteProfile
  onUpdate: (formData: FormData) => Promise<{ error?: string } | void>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.97] disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition-all duration-150"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving…
        </span>
      ) : 'Save changes'}
    </button>
  )
}

export default function EditAthleteForm({ athlete, onUpdate }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [sharingEnabled, setSharingEnabled] = useState(athlete.allow_public_sharing ?? false)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await onUpdate(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <>
    <form action={handleAction} className="space-y-5">
      <p className="text-sm text-text-muted">
        Changes are saved immediately and visible to all coaches.
      </p>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          defaultValue={athlete.name}
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
        />
      </div>

      {/* Date of birth */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Date of birth <span className="text-xs text-text-hint font-normal">(optional)</span>
        </label>
        <input
          type="date"
          name="date_of_birth"
          defaultValue={athlete.date_of_birth ?? ''}
          max={new Date().toISOString().split('T')[0]}
          onKeyDown={(e) => e.preventDefault()}
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
        />
      </div>

      {/* Running goal */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Running goal <span className="text-xs text-text-hint font-normal">(optional)</span>
        </label>
        <input
          type="text"
          name="running_goal"
          defaultValue={athlete.running_goal ?? ''}
          placeholder="e.g. Complete 5km without stopping"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
        />
      </div>

      {/* Structured goal — track with progress bar */}
      <div className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-400/20 rounded-lg px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">Track goal progress</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Goal type</label>
            <select
              name="goal_type"
              defaultValue={athlete.goal_type ?? ''}
              className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] bg-surface"
            >
              <option value="">None</option>
              <option value="distance_total">Total distance (km)</option>
              <option value="distance_single">Single run distance (km)</option>
              <option value="session_count">Number of sessions</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Target</label>
            <input
              type="number"
              name="goal_target"
              step="0.1"
              min="0"
              defaultValue={athlete.goal_target ?? ''}
              placeholder="e.g. 25"
              className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
            />
          </div>
        </div>
        <p className="text-[10px] text-teal-600 dark:text-teal-300">Set a measurable goal to show a progress bar on the athlete profile and caregiver dashboard.</p>
      </div>

      {/* Communication notes */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Communication notes <span className="text-xs text-text-hint font-normal">(optional)</span>
        </label>
        <textarea
          name="communication_notes"
          rows={2}
          defaultValue={athlete.communication_notes ?? ''}
          placeholder="e.g. Responds well to visual cues, prefers short instructions"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] resize-none"
        />
      </div>

      {/* Medical notes */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Medical notes <span className="text-xs text-text-hint font-normal">(optional)</span>
        </label>
        <textarea
          name="medical_notes"
          rows={2}
          defaultValue={athlete.medical_notes ?? ''}
          placeholder="e.g. Asthma — carry inhaler, no running in high humidity"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] resize-none"
        />
      </div>

      {/* Emergency contact */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Emergency contact <span className="text-xs text-text-hint font-normal">(optional)</span>
        </label>
        <input
          type="text"
          name="emergency_contact"
          defaultValue={athlete.emergency_contact ?? ''}
          placeholder="e.g. Mum — +65 9123 4567"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
        />
      </div>

      {/* Share achievements */}
      <div className="bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-400/20 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">📣 Share achievements</p>
          {athlete.sharing_disabled_by_caregiver ? (
            <span className="text-[10px] text-text-hint bg-surface-alt px-2 py-0.5 rounded-full">
              Disabled by caregiver
            </span>
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="allow_public_sharing"
                value="true"
                checked={sharingEnabled}
                onChange={(e) => setSharingEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-alt peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
            </label>
          )}
        </div>
        {athlete.sharing_disabled_by_caregiver ? (
          <p className="text-[10px] text-text-muted">
            {athlete.name}&apos;s caregiver turned this off. They can re-enable it from their dashboard.
          </p>
        ) : (
          <>
            <p className="text-[10px] text-teal-600 dark:text-teal-300">
              Create a shareable link for {athlete.name}&apos;s milestones and running journey. Caregivers can send it to family.
            </p>
            <p className="text-[10px] text-teal-600 dark:text-teal-300">
              The link shows: name, run count, distance, milestones. Never included: notes, medical info, contact details.
            </p>
            {sharingEnabled && (
              <div className="pt-1 space-y-1">
                <Link
                  href={`/story/${athlete.id}`}
                  className="text-[10px] text-teal-700 dark:text-teal-300 hover:text-teal-900 font-medium underline"
                >
                  Preview what the link looks like →
                </Link>
                {athlete.caregiver_user_id && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-300">
                    {athlete.name}&apos;s caregiver will be notified and can turn this off anytime.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      )}

      <SubmitButton />
    </form>

    {/* Athlete Access — separate from main form */}
    <AthletePinSection athleteId={athlete.id} athleteName={athlete.name} />
    </>
  )
}

// ─── Athlete PIN Setup Section ────────────────────────────────

function AthletePinSection({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const journeyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/my/${athleteId}`
    : `/my/${athleteId}`

  const handleSavePin = useCallback(async () => {
    setSaving(true)
    setResult(null)
    const res = await setAthletePin(athleteId, pin)
    setSaving(false)
    setResult(res)
    if (res.success) setPin('')
  }, [athleteId, pin])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(journeyUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [journeyUrl])

  return (
    <div className="mt-6 bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-400/20 rounded-lg px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">🏃 Athlete access page</p>
      <p className="text-[10px] text-teal-600 dark:text-teal-300 font-medium">
        Give {athleteName} their own page in 3 steps:
      </p>
      <ol className="text-[10px] text-teal-600 dark:text-teal-300 list-decimal list-inside space-y-0.5">
        <li>Set a simple 4-digit PIN below</li>
        <li>Print or share the QR code (tap the QR icon on the athlete&apos;s profile)</li>
        <li>The athlete or caregiver scans the QR code and enters the PIN to view their running journey</li>
      </ol>
      <p className="text-[10px] text-teal-600 dark:text-teal-300 italic">
        Tip: Choose a PIN the athlete can remember — like a birthday (e.g. 0512) or a favourite number.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">4-digit PIN</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 1234"
            className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSavePin}
          disabled={pin.length !== 4 || saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {saving ? 'Saving…' : 'Save PIN'}
        </button>
      </div>

      {result?.success && (
        <p className="text-[10px] text-emerald-600 font-medium">PIN saved! Now tap the QR icon at the top of {athleteName}&apos;s profile to print or share the QR code.</p>
      )}
      {result?.error && (
        <p className="text-[10px] text-red-600 dark:text-red-300 font-medium">{result.error}</p>
      )}

      <div className="pt-2 border-t border-teal-100 dark:border-teal-400/20 space-y-2">
        <p className="text-[10px] text-text-muted">
          Page link: <span className="font-mono text-teal-700 dark:text-teal-300">/my/{athleteId.slice(0, 8)}…</span>
        </p>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-[10px] text-teal-700 dark:text-teal-300 hover:text-teal-900 font-medium underline"
        >
          {linkCopied ? 'Copied!' : 'Copy link to clipboard'}
        </button>
      </div>
    </div>
  )
}
