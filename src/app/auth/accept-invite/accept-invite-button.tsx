'use client'

import { useState } from 'react'
import { acceptInvite } from './actions'

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleClick() {
    setPending(true)
    setError(false)
    try {
      await acceptInvite(token)
    } catch {
      // redirect() throws a special Next.js error — if we reach here
      // it means a real failure occurred (network error, server crash)
      setPending(false)
      setError(true)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ minHeight: '44px' }}
      >
        {pending ? 'Setting up your account...' : 'Accept Invitation'}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-3" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
    </>
  )
}
