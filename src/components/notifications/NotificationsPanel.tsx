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

type Props = {
  notifications: Notification[]
  userId: string
  onClose: () => void
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} days ago`
}

function getNotificationConfig(n: Notification): { message: string; tappable: boolean } {
  switch (n.type) {
    case 'feel_prompt':
      return {
        message: n.payload.message ?? 'How did the run go? Add a feel score',
        tappable: true,
      }
    case 'low_feel_alert':
      return {
        message: n.payload.message ?? 'An athlete had a tough session. Check in before next run.',
        tappable: true,
      }
    case 'unmatched_run':
      return {
        message: n.payload.message ?? 'A run needs linking to an athlete.',
        tappable: false,
      }
    case 'strava_disconnected':
      return {
        message: 'Reconnect your Strava account.',
        tappable: true,
      }
    default:
      return {
        message: n.payload.message ?? 'New notification',
        tappable: false,
      }
  }
}

export default function NotificationsPanel({ notifications, userId, onClose }: Props) {
  const hasUnread = notifications.some((n) => !n.read)
  const router = useRouter()

  async function handleMarkOne(id: string) {
    await markNotificationRead(id)
    onClose()
    router.refresh()
  }

  async function handleMarkAll() {
    await markAllNotificationsRead(userId)
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-t-2xl max-h-[70vh] flex flex-col">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">Notifications</span>
          {hasUnread && (
            <button
              className="text-xs text-teal-600 font-medium"
              onClick={handleMarkAll}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">You&apos;re all caught up 👍</p>
          ) : (
            notifications.map((n) => {
              const { message, tappable } = getNotificationConfig(n)
              const row = (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-gray-100 py-3 ${tappable && !n.read ? 'cursor-pointer' : ''}`}
                  onClick={tappable && !n.read ? () => handleMarkOne(n.id) : undefined}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      n.read ? 'bg-transparent border border-gray-200' : 'bg-teal-500'
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-sm ${n.read ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                      {message}
                    </span>
                    <span className="text-xs text-gray-400">{relativeTime(n.created_at)}</span>
                  </div>
                </div>
              )
              return row
            })
          )}
        </div>
      </div>
    </div>
  )
}
