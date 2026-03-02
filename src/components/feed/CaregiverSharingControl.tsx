'use client'

import { useState, useTransition } from 'react'
import { disableSharingAsCaregiver } from '@/app/feed/sharing-actions'

interface Props {
  athleteId: string
  athleteName: string
}

export default function CaregiverSharingControl({ athleteId, athleteName }: Props) {
  const [disabled, setDisabled] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDisable() {
    startTransition(async () => {
      const result = await disableSharingAsCaregiver(athleteId)
      if (!result.error) {
        setDisabled(true)
      }
    })
  }

  if (disabled) {
    return (
      <div className="bg-white/50 rounded-lg px-3 py-2.5">
        <p className="text-xs text-amber-700">
          Public sharing has been turned off for {athleteName}.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/50 rounded-lg px-3 py-2.5">
      <p className="text-xs font-semibold text-amber-700 mb-1">
        📣 {athleteName}&apos;s achievements are shareable
      </p>
      <p className="text-[10px] text-amber-600 mb-2">
        Milestones and journey stats can be shared with family via a link. Notes and personal info are never included.
      </p>
      <div className="flex items-center gap-2">
        <a
          href={`/story/${athleteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-amber-600 hover:text-amber-800 font-medium underline"
        >
          See what&apos;s shared
        </a>
        <button
          onClick={handleDisable}
          disabled={isPending}
          className="text-[10px] text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {isPending ? 'Turning off...' : 'Turn off'}
        </button>
      </div>
    </div>
  )
}
