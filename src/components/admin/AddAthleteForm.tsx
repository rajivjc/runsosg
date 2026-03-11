'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAthlete, type CreateAthleteState } from '@/app/admin/actions'

const initialState: CreateAthleteState = {}

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
          Creating…
        </span>
      ) : 'Create athlete'}
    </button>
  )
}

export default function AddAthleteForm() {
  const router = useRouter()
  const [state, formAction] = useFormState(createAthlete, initialState)

  useEffect(() => {
    if (state.athleteId) {
      router.push(`/athletes/${state.athleteId}`)
    }
  }, [state.athleteId, router])

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm text-gray-500">
        Only the athlete&apos;s name is required. All other details can be filled in from the athlete&apos;s profile at any time.
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
          placeholder="e.g. Ali Hassan"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
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
          max={new Date().toISOString().split('T')[0]}
          onKeyDown={(e) => e.preventDefault()}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
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
          placeholder="e.g. Complete 5km without stopping"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
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
          placeholder="e.g. Responds well to visual cues, prefers short instructions"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] resize-none"
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
          placeholder="e.g. Asthma — carry inhaler, no running in high humidity"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] resize-none"
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
          placeholder="e.g. Mum — +65 9123 4567"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  )
}
