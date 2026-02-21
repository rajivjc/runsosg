'use client'

import { useFormStatus } from 'react-dom'
import { useState } from 'react'

type AthleteProfile = {
  id: string
  name: string
  date_of_birth: string | null
  running_goal: string | null
  communication_notes: string | null
  medical_notes: string | null
  emergency_contact: string | null
}

type Props = {
  athlete: AthleteProfile
  onUpdate: (formData: FormData) => Promise<void>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  )
}

export default function EditAthleteForm({ athlete, onUpdate }: Props) {
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    await onUpdate(formData)
  }

  return (
    <form action={handleAction} className="space-y-5">
      <p className="text-sm text-gray-500">
        Changes are saved immediately and visible to all coaches.
      </p>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          defaultValue={athlete.name}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Date of birth */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date of birth <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          name="date_of_birth"
          defaultValue={athlete.date_of_birth ?? ''}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Running goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Running goal <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          name="running_goal"
          defaultValue={athlete.running_goal ?? ''}
          placeholder="e.g. Complete 5km without stopping"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Communication notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Communication notes <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          name="communication_notes"
          rows={2}
          defaultValue={athlete.communication_notes ?? ''}
          placeholder="e.g. Responds well to visual cues, prefers short instructions"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      {/* Medical notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Medical notes <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          name="medical_notes"
          rows={2}
          defaultValue={athlete.medical_notes ?? ''}
          placeholder="e.g. Asthma — carry inhaler, no running in high humidity"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      {/* Emergency contact */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Emergency contact <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          name="emergency_contact"
          defaultValue={athlete.emergency_contact ?? ''}
          placeholder="e.g. Mum — +65 9123 4567"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
