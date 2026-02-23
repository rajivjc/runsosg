'use server'

import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function markNotificationRead(notificationId: string): Promise<void> {
  await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  revalidatePath('/feed')
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  revalidatePath('/feed')
}

export async function fetchUnreadNotifications(userId: string): Promise<{
  count: number
  notifications: Array<{
    id: string
    type: string
    payload: Record<string, any>
    created_at: string
    read: boolean
  }>
}> {
  const { data, count } = await adminClient
    .from('notifications')
    .select('id, type, payload, created_at, read', { count: 'exact' })
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return {
    count: count ?? 0,
    notifications: (data ?? []) as any,
  }
}
