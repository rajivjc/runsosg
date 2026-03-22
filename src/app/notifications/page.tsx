import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { NotificationList } from './NotificationList'
import HintCard from '@/components/ui/HintCard'
import { HINT_KEYS } from '@/lib/hint-keys'

export const metadata: Metadata = { title: 'Notifications — SOSG Running Club' }

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
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        {hasUnread && (
          <NotificationList
            variant="mark-all"
          />
        )}
      </div>

      <HintCard
        storageKey={HINT_KEYS.HINT_NOTIFICATIONS}
        title="Notifications"
        description="Milestone awards, low feel alerts, and unmatched Strava runs appear here. Unmatched runs need your help to link to the right athlete."
      />

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-base font-semibold text-text-primary mb-1">All caught up</p>
          <p className="text-sm text-text-muted">
            Milestone awards, feel alerts, and Strava updates will appear here.
          </p>
        </div>
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
