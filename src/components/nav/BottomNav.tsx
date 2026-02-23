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

  // Fetch unread notification count server-side (coaches/admins only)
  let unreadCount = 0
  if (!isCaregiver) {
    const { data: unread } = await adminClient
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('read', false)
      .limit(10)
    unreadCount = (unread ?? []).length
  }

  return (
    <BottomNavClient
      isAdmin={isAdmin}
      isCaregiver={isCaregiver}
      unreadCount={unreadCount}
    />
  )
}
