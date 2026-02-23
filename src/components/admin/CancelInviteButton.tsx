'use client'

import { useState } from 'react'
import { cancelInvitation } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'

export default function CancelInviteButton({
  invitationId,
  email,
}: {
  invitationId: string
  email: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    await cancelInvitation(invitationId)
    setBusy(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600 font-medium">Cancel invite for {email}?</span>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg px-2.5 py-1 transition-colors"
        >
          {busy ? 'Cancelling…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-2.5 py-1 transition-colors"
    >
      Cancel
    </button>
  )
}
