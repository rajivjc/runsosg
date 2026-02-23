'use client'

import { useRouter } from 'next/navigation'
import { markNotificationRead, markAllNotificationsRead } from '@/app/notifications/actions'

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

type Props =
  | { variant: 'mark-all'; userId: string; notification?: never }
  | { variant: 'item'; notification: Notification; userId?: never }

export function NotificationList({ variant, userId, notification }: Props) {
  const router = useRouter()

  if (variant === 'mark-all') {
    return (
      <button
        className="text-xs text-teal-600 font-medium hover:text-teal-700"
        onClick={async () => {
          await markAllNotificationsRead(userId!)
          router.refresh()
        }}
      >
        Mark all read
      </button>
    )
  }

  const n = notification!
  const message = getNotificationMessage(n)
  const icon = getNotificationIcon(n.type)

  // Unmatched run notifications link to the resolution page
  const unmatchedId = n.type === 'unmatched_run' ? n.payload.unmatched_id : null
  const handleClick = unmatchedId
    ? () => router.push(`/notifications/unmatched/${unmatchedId}`)
    : undefined

  return (
    <div
      className={`rounded-xl border shadow-sm px-4 py-3 flex items-start gap-3 transition-all duration-300 ${
        n.read
          ? 'bg-gray-50 border-gray-100 opacity-40 scale-[0.98]'
          : 'bg-white border-teal-200'
      } ${unmatchedId ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      <span className={`text-lg mt-0.5 flex-shrink-0 ${n.read ? 'grayscale' : ''}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${n.read ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
          {message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {relativeTime(n.created_at)}
          {n.read && <span className="ml-2 text-gray-300">- dismissed</span>}
        </p>
        {unmatchedId && !n.read && (
          <p className="text-xs text-teal-600 mt-1">Tap to link to an athlete</p>
        )}
      </div>
      {!n.read && (
        <button
          className="flex-shrink-0 text-xs text-teal-600 font-medium hover:text-teal-700 mt-0.5"
          onClick={async (e) => {
            e.stopPropagation()
            await markNotificationRead(n.id)
            router.refresh()
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
