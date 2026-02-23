import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import BottomNavClient from './BottomNavClient'

export default async function BottomNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = userRow?.role === 'admin'
  const isCaregiver = userRow?.role === 'caregiver'

  let unreadCount = 0
  let notifications: { id: string; type: string; payload: Record<string, any>; created_at: string; read: boolean }[] = []

  if (!isCaregiver) {
    const { count } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    unreadCount = count ?? 0

    const { data: notifRows } = await adminClient
      .from('notifications')
      .select('id, type, payload, created_at, read')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
    notifications = (notifRows ?? []) as typeof notifications
  }

  return (
    <BottomNavClient
      isAdmin={isAdmin}
      isCaregiver={isCaregiver}
      unreadCount={unreadCount}
      notifications={notifications}
      userId={user.id}
    />
  )
}
