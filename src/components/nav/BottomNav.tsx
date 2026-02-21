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

  return <BottomNavClient isAdmin={isAdmin} isCaregiver={isCaregiver} />
}
