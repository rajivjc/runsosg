import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { NotificationList } from './NotificationList'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRow || userRow.role === 'caregiver') {
    redirect('/feed')
  }

  const { data } = await adminClient
    .from('notifications')
    .select('id, type, payload, created_at, read')
    .eq('user_id', user.id)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as Array<{
    id: string
    type: string
    payload: Record<string, any>
    created_at: string
    read: boolean
  }>

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {hasUnread && (
          <NotificationList
            variant="mark-all"
            userId={user.id}
          />
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No notifications yet.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationList
              key={n.id}
              variant="item"
              notification={n}
            />
          ))}
        </div>
      )}
    </main>
  )
}
