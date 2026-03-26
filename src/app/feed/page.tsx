import type { Metadata } from 'next'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { loadCoachFeedData } from '@/lib/feed/coach-data'
import { loadCaregiverFeedData } from '@/lib/feed/caregiver-data'
import { getCoachPriorities } from '@/lib/feed/coach-priorities'
import CoachFeed from '@/components/feed/CoachFeed'
import CaregiverFeed from '@/components/feed/CaregiverFeed'
import { getClub } from '@/lib/club'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Feed — ${club.name}` }
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch role — the feed data loaders already fetch user role internally,
  // so this is just to decide which loader to call
  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userRow?.role === 'caregiver') {
    const data = await loadCaregiverFeedData(user.id)
    return <CaregiverFeed data={data} userId={user.id} />
  }

  // Coach/admin: load feed data and priorities in parallel
  const [data, priorities] = await Promise.all([
    loadCoachFeedData(user.id),
    getCoachPriorities(user.id),
  ])
  return <CoachFeed data={data} userId={user.id} priorities={priorities} />
}
