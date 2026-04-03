'use client'

import { useState } from 'react'
import { disconnectStrava } from '@/app/account/actions'
import { useClubConfig } from '@/components/providers/ClubConfigProvider'

type Connection = {
  strava_athlete_id: number | null
  token_expires_at: string | null
  last_sync_at: string | null
  last_sync_status: string | null
  last_error: string | null
  created_at: string | null
} | null

export default function StravaStatus({ connection }: { connection: Connection }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const { locale } = useClubConfig()

  if (!connection) {
    return (
      <div className="rounded-xl border border-orange-200 dark:border-orange-400/20 bg-orange-50 dark:bg-orange-900/10 p-4">
        <p className="text-sm font-medium text-orange-900 mb-1">Not connected</p>
        <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
          Connect Strava so your runs automatically sync to athlete profiles.
        </p>
        <a
          href="/strava/consent"
          className="inline-block bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-all duration-150"
        >
          Connect Strava
        </a>
      </div>
    )
  }

  const isHealthy = connection.last_sync_status === 'ok' || connection.last_sync_status === null
  const lastSync = connection.last_sync_at
    ? new Date(connection.last_sync_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never'

  return (
    <div className={`rounded-xl border p-4 ${isHealthy ? 'border-green-200 dark:border-green-400/20 bg-green-50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-900/10'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-medium ${isHealthy ? 'text-green-900' : 'text-red-900'}`}>
          {isHealthy ? '✓ Connected' : '⚠ Connection issue'}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isHealthy ? 'bg-green-100 text-green-700 dark:text-green-300' : 'bg-red-100 text-red-700 dark:text-red-300'}`}>
          {isHealthy ? 'Active' : 'Error'}
        </span>
      </div>

      <p className="text-xs text-text-muted mb-1">Last sync: {lastSync}</p>

      {!isHealthy && connection.last_error && (
        <p className="text-xs text-red-600 dark:text-red-300 mb-3">{connection.last_error}</p>
      )}

      {confirming ? (
        <div className="mt-3 rounded-lg border border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-900/10 px-3 py-3">
          <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
            Disconnect Strava? Your runs will no longer sync automatically.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy(true)
                await disconnectStrava()
              }}
              disabled={busy}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] disabled:opacity-60 rounded-lg px-3 py-1.5 transition-all duration-150"
            >
              {busy ? 'Disconnecting…' : 'Yes, disconnect'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="text-xs text-text-secondary hover:text-text-primary px-2 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <a
            href="/strava/consent"
            className="text-xs font-medium text-text-secondary hover:text-teal-600 dark:hover:text-teal-300 active:scale-[0.97] border border-border rounded-lg px-3 py-1.5 transition-all duration-150"
          >
            Reconnect
          </a>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 active:scale-[0.97] border border-red-100 rounded-lg px-3 py-1.5 transition-all duration-150"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
