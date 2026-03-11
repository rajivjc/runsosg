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
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    const result = await cancelInvitation(invitationId)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-red-600 font-medium whitespace-nowrap">Remove {email} completely?</span>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] disabled:opacity-60 rounded-lg px-2.5 py-1 transition-all duration-150"
          >
            {busy ? 'Removing…' : 'Yes, remove'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            disabled={busy}
            className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 transition-colors"
          >
            No
          </button>
        </div>
        <p className="text-[10px] text-gray-400">This will delete the invitation and the pending account.</p>
        {error && <p className="text-[10px] text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-red-500 hover:text-red-700 active:scale-[0.97] border border-red-100 rounded-lg px-2.5 py-1 transition-all duration-150"
    >
      Cancel
    </button>
  )
}
