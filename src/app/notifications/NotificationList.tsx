'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markNotificationRead, markAllNotificationsRead, dismissUnmatchedRun } from '@/app/notifications/actions'

type Notification = {
  id: string
  type: string
  payload: Record<string, any>
  created_at: string
  read: boolean
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

function getNotificationMessage(n: Notification): string {
  switch (n.type) {
    case 'milestone':
      return n.payload.message ?? 'An athlete earned a milestone!'
    case 'feel_prompt':
      return n.payload.message ?? 'How did the run go? Add a feel score.'
    case 'low_feel_alert':
      return n.payload.message ?? 'An athlete had a tough session. Check in before next run.'
    case 'unmatched_run':
      return n.payload.message ?? 'A run needs linking to an athlete.'
    case 'strava_disconnected':
      return 'Reconnect your Strava account.'
    default:
      return n.payload.message ?? 'New notification'
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'milestone': return '🏅'
    case 'feel_prompt': return '💬'
    case 'low_feel_alert': return '⚠️'
    case 'unmatched_run': return '🔗'
    case 'strava_disconnected': return '🔌'
    default: return '🔔'
  }
}

function getClickTarget(n: Notification): string | null {
  if (n.type === 'unmatched_run' && n.payload.unmatched_id) {
    return `/notifications/unmatched/${n.payload.unmatched_id}`
  }
  if (n.type === 'feel_prompt' && n.payload.athlete_id) {
    return `/athletes/${n.payload.athlete_id}`
  }
  if (n.type === 'low_feel_alert' && n.payload.athlete_id) {
    return `/athletes/${n.payload.athlete_id}`
  }
  if (n.type === 'milestone' && n.payload.athlete_id) {
    return `/athletes/${n.payload.athlete_id}`
  }
  if (n.type === 'strava_disconnected') {
    return '/account'
  }
  return null
}

function getClickHint(n: Notification): string | null {
  if (n.type === 'unmatched_run') return 'Tap to link to an athlete'
  if (n.type === 'feel_prompt') return 'Tap to view athlete and rate the run'
  if (n.type === 'low_feel_alert') return 'Tap to view athlete'
  if (n.type === 'milestone') return 'Tap to view athlete'
  if (n.type === 'strava_disconnected') return 'Tap to reconnect'
  return null
}

type Props =
  | { variant: 'mark-all'; userId?: string; notification?: never }
  | { variant: 'item'; notification: Notification; userId?: never }

export function NotificationList({ variant, notification }: Props) {
  const router = useRouter()
  const [markedRead, setMarkedRead] = useState(notification?.read ?? false)
  const [explicitlyDismissed, setExplicitlyDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (variant === 'mark-all') {
    return (
      <button
        disabled={busy}
        className="text-xs text-teal-600 font-medium hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={async () => {
          setBusy(true)
          await markAllNotificationsRead()
          router.refresh()
          setBusy(false)
        }}
      >
        {busy ? 'Marking…' : 'Mark all read'}
      </button>
    )
  }

  const n = notification!
  const message = getNotificationMessage(n)
  const icon = getNotificationIcon(n.type)
  const isRead = n.read || markedRead
  const showDismissedStyle = explicitlyDismissed

  const clickTarget = getClickTarget(n)
  const clickHint = getClickHint(n)

  const isUnmatched = n.type === 'unmatched_run'

  const handleClick = clickTarget
    ? () => {
        // For unmatched_run, don't mark as read on click — let the resolve
        // action mark it read when the coach actually links the athlete.
        if (!isRead && !isUnmatched) {
          markNotificationRead(n.id) // fire-and-forget, no await
        }
        router.push(clickTarget)
      }
    : undefined

  const handleDismissAsNotCoaching = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!n.payload.unmatched_id) return
    setBusy(true)
    setExplicitlyDismissed(true)
    await dismissUnmatchedRun(n.id, n.payload.unmatched_id)
    router.refresh()
    setBusy(false)
  }

  return (
    <div
      className={`rounded-xl border shadow-sm px-4 py-3 flex items-start gap-3 transition-all duration-500 ease-in-out ${
        showDismissedStyle
          ? 'bg-gray-50 border-gray-200 opacity-60 scale-[0.98]'
          : isRead
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-teal-200'
      } ${clickTarget ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <span className={`text-lg mt-0.5 flex-shrink-0 transition-all duration-500 ${showDismissedStyle ? 'grayscale' : ''}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm transition-all duration-500 ${
          showDismissedStyle
            ? 'text-gray-400 line-through'
            : isRead
              ? 'text-gray-500'
              : 'text-gray-900 font-medium'
        }`}>
          {message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {relativeTime(n.created_at)}
          {showDismissedStyle && <span className="ml-2 text-gray-300 italic">dismissed</span>}
        </p>
        {clickTarget && !isRead && clickHint && (
          <p className="text-xs text-teal-600 mt-1">{clickHint}</p>
        )}
      </div>
      {!isRead && !explicitlyDismissed && (
        <div className="flex flex-col gap-1.5 flex-shrink-0 mt-0.5">
          {isUnmatched && n.payload.unmatched_id && (
            <button
              disabled={busy}
              className="text-xs text-gray-500 font-medium hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              onClick={handleDismissAsNotCoaching}
            >
              {busy ? 'Skipping…' : 'Not coaching'}
            </button>
          )}
          <button
            className="text-xs text-teal-600 font-medium hover:text-teal-700"
            onClick={async (e) => {
              e.stopPropagation()
              setExplicitlyDismissed(true)
              await markNotificationRead(n.id)
              router.refresh()
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
