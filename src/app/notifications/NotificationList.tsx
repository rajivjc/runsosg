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

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-start gap-3 ${
        n.read ? 'border-gray-100 opacity-60' : 'border-teal-200'
      }`}
    >
      <span className="text-lg mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${n.read ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
          {message}
        </p>
        <p className="text-xs text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
      </div>
      {!n.read && (
        <button
          className="flex-shrink-0 text-xs text-teal-600 font-medium hover:text-teal-700 mt-0.5"
          onClick={async () => {
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
