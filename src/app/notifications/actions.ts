'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationRead(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { error } = await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { error: 'Could not dismiss notification.' }

  revalidatePath('/notifications')
  // Reading notifications doesn't change feed content — skip revalidatePath('/feed')
  return {}
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { error } = await adminClient
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return { error: 'Could not mark notifications as read.' }

  revalidatePath('/notifications')
  // Reading notifications doesn't change feed content — skip revalidatePath('/feed')
  return {}
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
  const empty = { count: 0, notifications: [] }

  // Verify the caller is the owner of these notifications
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return empty

  const { data } = await adminClient
    .from('notifications')
    .select('id, type, payload, created_at, read')
    .eq('user_id', user.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = (data ?? []) as any
  return {
    count: notifications.length,
    notifications,
  }
}
