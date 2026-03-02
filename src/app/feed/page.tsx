import type { Metadata } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { loadCoachFeedData } from '@/lib/feed/coach-data'
import { loadCaregiverFeedData } from '@/lib/feed/caregiver-data'
import CoachFeed from '@/components/feed/CoachFeed'
import CaregiverFeed from '@/components/feed/CaregiverFeed'

export const metadata: Metadata = { title: 'Feed — SOSG Running Club' }

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isCaregiver = userRow?.role === 'caregiver'

  if (isCaregiver) {
    const data = await loadCaregiverFeedData(user.id)
    return <CaregiverFeed data={data} userId={user.id} />
  }

  const data = await loadCoachFeedData(user.id)
  return <CoachFeed data={data} userId={user.id} />
}
