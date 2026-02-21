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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm(
      `Permanently delete ${athleteName}? This will remove all their sessions, notes, and cues. This cannot be undone.`
    )) return

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

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 border border-red-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        {busy ? 'Deleting…' : 'Delete athlete'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
