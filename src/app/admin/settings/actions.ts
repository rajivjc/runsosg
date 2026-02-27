'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateClubSettings(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const name = (formData.get('name') as string ?? '').trim()
  const homeLocation = (formData.get('home_location') as string ?? '').trim() || null
  const sessionDay = (formData.get('session_day') as string ?? '').trim() || null
  const sessionTime = (formData.get('session_time') as string ?? '').trim() || null
  const stravaClubIdStr = (formData.get('strava_club_id') as string ?? '').trim()
  const stravaClubId = stravaClubIdStr ? parseInt(stravaClubIdStr, 10) : null

  if (!name) return { error: 'Club name is required.' }

  // Fetch existing settings to determine insert vs update
  const { data: existing } = await adminClient
    .from('club_settings')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await adminClient
      .from('club_settings')
      .update({
        name,
        home_location: homeLocation,
        session_day: sessionDay,
        session_time: sessionTime,
        strava_club_id: stravaClubId && !isNaN(stravaClubId) ? stravaClubId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) return { error: 'Could not save settings. Please try again.' }
  } else {
    const { error } = await adminClient
      .from('club_settings')
      .insert({
        name,
        logo_url: null,
        home_location: homeLocation,
        session_day: sessionDay,
        session_time: sessionTime,
        strava_club_id: stravaClubId && !isNaN(stravaClubId) ? stravaClubId : null,
        timezone: 'Asia/Singapore',
        updated_at: new Date().toISOString(),
      })

    if (error) return { error: 'Could not save settings. Please try again.' }
  }

  revalidatePath('/admin/settings')
  return { success: 'Settings saved.' }
}
