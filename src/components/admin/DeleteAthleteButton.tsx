'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAthlete } from '@/app/admin/actions'

type Props = {
  athleteId: string
  athleteName: string
}

export default function DeleteAthleteButton({ athleteId, athleteName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    const result = await deleteAthlete(athleteId)
    if (result.error) {
      setError(result.error)
      setBusy(false)
      return
    }
    router.push('/athletes')
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-400/20 rounded-xl p-3">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
            Permanently delete {athleteName}?
          </p>
          <p className="text-xs text-red-600 dark:text-red-300 mb-3">
            This will remove all their sessions, notes, and cues. This cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] disabled:opacity-60 rounded-lg px-3 py-1.5 transition-all duration-150"
            >
              {busy ? 'Deleting…' : 'Yes, delete permanently'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="text-xs text-text-muted hover:text-text-secondary px-2 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300 active:scale-[0.97] border border-red-200 dark:border-red-400/20 rounded-lg px-3 py-1.5 transition-all duration-150"
      >
        Delete athlete
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>}
    </div>
  )
}
