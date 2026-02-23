'use server'

import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function markNotificationRead(notificationId: string): Promise<void> {
  await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  revalidatePath('/notifications')
  revalidatePath('/feed')
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  revalidatePath('/notifications')
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
  const { data } = await adminClient
    .from('notifications')
    .select('id, type, payload, created_at, read')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = (data ?? []) as any
  return {
    count: notifications.length,
    notifications,
  }
}
