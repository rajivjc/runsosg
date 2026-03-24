'use client'

import { useState, useTransition } from 'react'
import { toggleSessionNotifications } from './session-notifications-action'

type Props = {
  initialEnabled: boolean
}

export default function SessionNotificationsToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const newValue = !enabled
    setEnabled(newValue)
    startTransition(async () => {
      const result = await toggleSessionNotifications(newValue)
      if (result?.error) {
        // Revert on failure
        setEnabled(!newValue)
      }
    })
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Session Notifications</p>
        <p className="text-xs text-text-muted">
          {enabled ? 'RSVP and assignment alerts' : 'Receive session RSVP and assignment alerts'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
          enabled ? 'bg-teal-600' : 'bg-surface-alt'
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle session notifications"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
