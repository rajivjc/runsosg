'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Caregiver disables public sharing for their linked athlete.
 * Sets both allow_public_sharing = false AND sharing_disabled_by_caregiver = true
 * so coaches cannot re-enable without the caregiver's involvement.
 */
export async function disableSharingAsCaregiver(
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Verify the caller is a caregiver linked to this athlete
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'caregiver') {
    return { error: 'Only caregivers can disable sharing from this control.' }
  }

  const { data: athlete } = await adminClient
    .from('athletes')
    .select('caregiver_user_id')
    .eq('id', athleteId)
    .single()
  if (athlete?.caregiver_user_id !== user.id) {
    return { error: 'You can only manage sharing for your linked athlete.' }
  }

  const { error } = await adminClient
    .from('athletes')
    .update({
      allow_public_sharing: false,
      sharing_disabled_by_caregiver: true,
    })
    .eq('id', athleteId)

  if (error) return { error: 'Could not update sharing settings. Please try again.' }

  revalidatePath('/feed')
  revalidatePath(`/athletes/${athleteId}`)
  return {}
}
