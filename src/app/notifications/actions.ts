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
