'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSession, deleteSession } from '@/app/admin/sessions/actions'

type Props = {
  sessionId: string
}

export default function SessionDraftActions({ sessionId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    if (!window.confirm('Cancel this draft session? This cannot be undone.')) return
    setBusy(true)
    setError(null)
    const result = await cancelSession(sessionId)
    if (result.error) {
      setError(result.error)
      setBusy(false)
    }
  }

  return (
    <>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => router.push(`/admin/sessions/${sessionId}/edit`)}
          disabled={busy}
          className="flex-1 py-2 px-3 text-[13px] font-semibold rounded-lg bg-accent text-white border-none cursor-pointer disabled:opacity-50"
        >
          Edit & Publish
        </button>
        <button
          onClick={handleCancel}
          disabled={busy}
          className="py-2 px-3 text-[13px] font-medium rounded-lg bg-surface text-text-muted border border-border cursor-pointer disabled:opacity-50"
        >
          {busy ? '…' : 'Cancel'}
        </button>
      </div>
    </>
  )
}
