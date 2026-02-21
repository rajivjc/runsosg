'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { inviteUser, type InviteFormState } from '@/app/admin/actions'

type Athlete = { id: string; name: string }

const initialState: InviteFormState = {}

export default function AdminInviteForm({ athletes }: { athletes: Athlete[] }) {
  const [state, formAction] = useFormState(inviteUser, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const roleRef = useRef<HTMLSelectElement>(null)
  const [selectedRole, setSelectedRole] = useState('coach')

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setSelectedRole('coach')
    }
  }, [state.success])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email address
        </label>
        <input
          type="email"
          name="email"
          required
          placeholder="coach@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          name="role"
          ref={roleRef}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="coach">Coach</option>
          <option value="caregiver">Caregiver</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Athlete — only shown for caregiver */}
      {selectedRole === 'caregiver' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Athlete
          </label>
          <select
            name="athlete_id"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select athlete…</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Feedback */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">{state.success}</p>
      )}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
    >
      {pending ? 'Sending…' : 'Send invitation'}
    </button>
  )
}
