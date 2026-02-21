'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateDisplayName } from '@/app/account/actions'

const initialState: { error?: string; success?: string } = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  )
}

export default function DisplayNameForm({ currentName }: { currentName: string | null }) {
  const [state, formAction] = useFormState(updateDisplayName, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="name"
        defaultValue={currentName ?? ''}
        placeholder="e.g. Rajiv"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {!currentName && (
        <p className="text-xs text-orange-600">
          Set your display name so teammates can identify your notes.
        </p>
      )}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs text-green-600">{state.success}</p>}
      <SubmitButton />
    </form>
  )
}
