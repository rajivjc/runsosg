'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushToRole } from '@/lib/push'

export async function sendCheer(
  athleteId: string,
  message: string
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is a caregiver
  const { data: userRow } = await adminClient
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (userRow?.role !== 'caregiver') return { error: 'Only caregivers can send cheers' }

  // Verify this caregiver is linked to this athlete
  const { data: athlete } = await adminClient
    .from('athletes')
    .select('id, name, caregiver_user_id')
    .eq('id', athleteId)
    .single()

  if (!athlete || athlete.caregiver_user_id !== user.id) {
    return { error: 'You can only send cheers for your linked athlete' }
  }

  // Enforce message length
  const trimmed = message.trim()
  if (!trimmed || trimmed.length > 100) {
    return { error: 'Message must be 1–100 characters' }
  }

  // Rate limit: max 3 cheers per day per caregiver
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await adminClient
    .from('cheers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())

  if ((count ?? 0) >= 3) {
    return { error: 'You\'ve sent 3 cheers today — come back tomorrow!' }
  }

  const { error } = await adminClient
    .from('cheers')
    .insert({ athlete_id: athleteId, user_id: user.id, message: trimmed })

  if (error) {
    console.error('Failed to insert cheer:', error)
    return { error: 'Something went wrong' }
  }

  // Push notification to coaches and admins
  const caregiverName = userRow?.name?.split(' ')[0] ?? 'A caregiver'
  const pushPayload = {
    title: `Cheer for ${athlete?.name ?? 'an athlete'}`,
    body: `${caregiverName}: "${trimmed}"`,
    url: '/feed',
    tag: `cheer-${athleteId}`,
  }
  sendPushToRole('coach', pushPayload).catch(() => {})
  sendPushToRole('admin', pushPayload).catch(() => {})

  revalidatePath('/feed')
  revalidatePath(`/athletes/${athleteId}`)
  return { success: 'Cheer sent!' }
}

export async function markCheersViewed(
  cheerIds: string[]
): Promise<{ error?: string }> {
  if (cheerIds.length === 0) return {}

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only coaches/admins can mark cheers as viewed
  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRow || !['admin', 'coach'].includes(userRow.role)) {
    return { error: 'Only coaches can mark cheers as viewed' }
  }

  const { error } = await adminClient
    .from('cheers')
    .update({ viewed_at: new Date().toISOString() })
    .in('id', cheerIds)
    .is('viewed_at', null)

  if (error) {
    console.error('Failed to mark cheers as viewed:', error)
    return { error: 'Could not mark cheers as viewed' }
  }

  // Viewing cheers doesn't change feed content — skip revalidatePath('/feed')
  return {}
}
