'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { CLUB_CACHE_TAG } from '@/lib/club'

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
  const tagline = (formData.get('tagline') as string ?? '').trim() || null
  const locale = (formData.get('locale') as string ?? '').trim() || 'en-SG'
  const timezone = (formData.get('timezone') as string ?? '').trim() || 'Asia/Singapore'
  const stravaHashtagPrefix = (formData.get('strava_hashtag_prefix') as string ?? '').trim() || null

  if (!name) return { error: 'Club name is required.' }

  function isValidTimezone(tz: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz })
      return true
    } catch {
      return false
    }
  }
  if (!isValidTimezone(timezone)) {
    return { error: 'Invalid timezone. Please select a timezone from the dropdown.' }
  }

  // Fetch existing settings to determine insert vs update
  const { data: existing } = await adminClient
    .from('clubs')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await adminClient
      .from('clubs')
      .update({
        name,
        home_location: homeLocation,
        session_day: sessionDay,
        session_time: sessionTime,
        strava_club_id: stravaClubId && !isNaN(stravaClubId) ? stravaClubId : null,
        tagline,
        locale,
        timezone,
        strava_hashtag_prefix: stravaHashtagPrefix,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) return { error: 'Could not save settings. Please try again.' }
  } else {
    const { error } = await adminClient
      .from('clubs')
      .insert({
        name,
        logo_url: null,
        home_location: homeLocation,
        session_day: sessionDay,
        session_time: sessionTime,
        strava_club_id: stravaClubId && !isNaN(stravaClubId) ? stravaClubId : null,
        tagline,
        locale,
        strava_hashtag_prefix: stravaHashtagPrefix,
        timezone,
        updated_at: new Date().toISOString(),
      })

    if (error) return { error: 'Could not save settings. Please try again.' }
  }

  revalidateTag(CLUB_CACHE_TAG)

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'admin',
    action: 'settings.update',
    targetType: 'club_settings',
    metadata: { name },
  })

  revalidatePath('/admin/settings')
  return { success: 'Settings saved.' }
}
