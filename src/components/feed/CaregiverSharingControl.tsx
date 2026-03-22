'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Public sharing has been turned off for {athleteName}.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/50 rounded-lg px-3 py-2.5">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
        📣 {athleteName}&apos;s achievements are shareable
      </p>
      <p className="text-[10px] text-amber-600 dark:text-amber-300 mb-2">
        Milestones and journey stats can be shared with family via a link. Notes and personal info are never included.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={`/story/${athleteId}`}
          className="text-[10px] text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-300 font-medium underline"
        >
          See what&apos;s shared
        </Link>
        <button
          onClick={handleDisable}
          disabled={isPending}
          className="text-[10px] text-red-500 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50"
        >
          {isPending ? 'Turning off...' : 'Turn off'}
        </button>
      </div>
    </div>
  )
}
