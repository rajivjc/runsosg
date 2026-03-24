import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import { getUpcomingSessionDate } from '@/lib/sessions/datetime'
import SessionForm from '@/components/sessions/SessionForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `New Session — ${club.name}` }
}

export default async function NewSessionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role, can_manage_sessions')
    .eq('id', user.id)
    .single()

  const isAdmin = callerUser?.role === 'admin'
  const canManage = callerUser?.role === 'coach' && callerUser?.can_manage_sessions
  if (!isAdmin && !canManage) redirect('/feed')

  const club = await getClub()

  // Pre-fill from recurring template
  const date = club.recurring_session_day != null
    ? getUpcomingSessionDate(club.recurring_session_day, club.timezone)
    : ''
  const startTime = club.recurring_session_time ?? ''
  const endTime = club.recurring_session_end ?? ''
  const location = club.recurring_session_location ?? ''

  return (
    <main className="max-w-lg mx-auto">
      <SessionForm
        mode="create"
        timezone={club.timezone}
        defaults={{
          date,
          startTime,
          endTime,
          location,
          title: '',
          notes: '',
          coachDeadline: '',
          athleteDeadline: '',
        }}
      />
    </main>
  )
}
