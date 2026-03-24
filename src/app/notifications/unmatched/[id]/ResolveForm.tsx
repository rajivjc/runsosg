'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveUnmatchedRun, resyncFromStrava, dismissAsNotCoaching } from './actions'

type Athlete = { id: string; name: string }

export function ResolveForm({
  unmatchedId,
  athletes,
  hashtagPrefix,
}: {
  unmatchedId: string
  athletes: Athlete[]
  hashtagPrefix: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = search.trim()
    ? athletes.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : athletes

  async function handleSubmit() {
    if (!selectedId) return
    setSubmitting(true)
    setError(null)

    const result = await resolveUnmatchedRun(unmatchedId, selectedId)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    router.push('/notifications')
    router.refresh()
  }

  async function handleResync() {
    setResyncing(true)
    setError(null)

    const result = await resyncFromStrava(unmatchedId)
    if (result.matched) {
      router.push('/notifications')
      router.refresh()
      return
    }

    setError(result.error ?? 'Re-sync did not find a match')
    setResyncing(false)
  }

  async function handleDismiss() {
    setDismissing(true)
    setError(null)

    const result = await dismissAsNotCoaching(unmatchedId)
    if (result.error) {
      setError(result.error)
      setDismissing(false)
      return
    }

    router.push('/notifications')
    router.refresh()
  }

  const busy = submitting || resyncing || dismissing

  return (
    <div>
      {/* Re-sync option */}
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-400/20 rounded-xl p-4 mb-5">
        <p className="text-sm font-medium text-orange-800 mb-1">
          Already tagged in Strava?
        </p>
        <p className="text-xs text-orange-600 mb-3">
          If you added hashtags (e.g. {hashtagPrefix} #athletename) to the title or description, re-sync to auto-match.
        </p>
        <button
          type="button"
          onClick={handleResync}
          disabled={busy}
          className="w-full bg-orange-500 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resyncing ? 'Re-syncing...' : 'Re-sync from Strava'}
        </button>
      </div>

      <div className="relative flex items-center justify-center mb-5">
        <div className="border-t border-border w-full" />
        <span className="absolute bg-surface-raised px-3 text-xs text-text-hint uppercase tracking-wide">or link manually</span>
      </div>

      {/* Manual link */}
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Select an athlete
      </label>

      <input
        type="text"
        placeholder="Search athletes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
      />

      <div className="bg-surface rounded-xl border border-border shadow-sm max-h-64 overflow-y-auto mb-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-text-hint text-center py-4">
            No athletes found
          </p>
        ) : (
          filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              disabled={busy}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-b-0 transition-colors ${
                selectedId === a.id
                  ? 'bg-teal-50 dark:bg-teal-900/10 text-teal-900 font-medium'
                  : 'text-text-secondary hover:bg-surface-raised'
              }`}
            >
              {a.name}
            </button>
          ))
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-300 mb-3">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedId || busy}
        className="w-full bg-teal-600 text-white dark:bg-teal-400 dark:text-gray-950 font-medium rounded-lg py-3 text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Linking...' : 'Link to athlete'}
      </button>

      {/* Dismiss as not a coaching run */}
      <div className="relative flex items-center justify-center my-5">
        <div className="border-t border-border w-full" />
        <span className="absolute bg-surface-raised px-3 text-xs text-text-hint uppercase tracking-wide">or</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        disabled={busy}
        className="w-full border border-border-strong text-text-muted font-medium rounded-lg py-2.5 text-sm hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {dismissing ? 'Skipping...' : 'Skip — not a coaching run'}
      </button>
    </div>
  )
}
