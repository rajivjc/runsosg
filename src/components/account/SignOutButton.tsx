'use client'

import { signOut } from '@/app/account/actions'

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        Sign out
      </button>
    </form>
  )
}
