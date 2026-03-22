'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { saveWelcomeName, type WelcomeFormState } from './actions'

const initialState: WelcomeFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Saving…
        </>
      ) : (
        'Get Started'
      )}
    </button>
  )
}

export default function WelcomeForm({ role }: { role: string }) {
  const [state, formAction] = useFormState(saveWelcomeName, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state.redirectTo, router])

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
          What should we call you?
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          placeholder={role === 'caregiver' ? 'e.g. Sarah' : 'e.g. Coach Rajiv'}
          autoComplete="name"
          className="block w-full rounded-lg border border-border-strong px-3 py-2.5 text-sm placeholder-text-hint focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        {state.error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-300" role="alert">
            {state.error}
          </p>
        )}
      </div>

      <SubmitButton />

      {role === 'coach' && (
        <p className="text-xs text-text-hint text-center">
          You can connect Strava later from the feed.
        </p>
      )}
    </form>
  )
}
