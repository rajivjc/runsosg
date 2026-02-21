'use client'

import { disconnectStrava } from '@/app/account/actions'

type Connection = {
  strava_athlete_id: number | null
  token_expires_at: string | null
  last_sync_at: string | null
  last_sync_status: string | null
  last_error: string | null
  created_at: string | null
} | null

export default function StravaStatus({ connection }: { connection: Connection }) {
  if (!connection) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
        <p className="text-sm font-medium text-orange-900 mb-1">Not connected</p>
        <p className="text-xs text-orange-700 mb-3">
          Connect Strava so your runs automatically sync to athlete profiles.
        </p>
        <a
          href="/api/strava/connect"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
        >
          Connect Strava
        </a>
      </div>
    )
  }

  const isHealthy = connection.last_sync_status === 'ok' || connection.last_sync_status === null
  const lastSync = connection.last_sync_at
    ? new Date(connection.last_sync_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never'

  return (
    <div className={`rounded-xl border p-4 ${isHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-medium ${isHealthy ? 'text-green-900' : 'text-red-900'}`}>
          {isHealthy ? '✓ Connected' : '⚠ Connection issue'}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isHealthy ? 'Active' : 'Error'}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-1">Last sync: {lastSync}</p>

      {!isHealthy && connection.last_error && (
        <p className="text-xs text-red-600 mb-3">{connection.last_error}</p>
      )}

      <div className="flex gap-2 mt-3">
        <a
          href="/api/strava/connect"
          className="text-xs font-medium text-gray-600 hover:text-teal-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          Reconnect
        </a>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Disconnect Strava? Your runs will no longer sync automatically.')) {
              disconnectStrava()
            }
          }}
          className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-3 py-1.5 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}
