import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import SessionForm from '@/components/sessions/SessionForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Edit Session — ${club.name}` }
}

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: session } = await adminClient
    .from('training_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()
  if (session.status !== 'draft' && session.status !== 'published') {
    redirect('/admin/sessions')
  }

  // Extract date and time from session_start in club timezone
  const sessionDate = new Date(session.session_start)
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: club.timezone }).format(sessionDate) // YYYY-MM-DD
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: club.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(sessionDate) // HH:mm

  let endTimeParts = ''
  if (session.session_end) {
    endTimeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: club.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(session.session_end))
  }

  // Format RSVP deadlines back to datetime-local format
  function toDatetimeLocal(isoStr: string | null): string {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: club.timezone }).format(d)
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: club.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
    return `${dateStr}T${timeStr}`
  }

  return (
    <main className="max-w-lg mx-auto">
      <SessionForm
        mode="edit"
        timezone={club.timezone}
        session={{
          id: session.id,
          date: dateParts,
          startTime: timeParts,
          endTime: endTimeParts,
          location: session.location,
          title: session.title ?? '',
          notes: session.notes ?? '',
          coachDeadline: toDatetimeLocal(session.coach_rsvp_deadline),
          athleteDeadline: toDatetimeLocal(session.athlete_rsvp_deadline),
          status: session.status,
        }}
        defaults={{
          date: dateParts,
          startTime: timeParts,
          endTime: endTimeParts,
          location: session.location,
          title: session.title ?? '',
          notes: session.notes ?? '',
          coachDeadline: toDatetimeLocal(session.coach_rsvp_deadline),
          athleteDeadline: toDatetimeLocal(session.athlete_rsvp_deadline),
        }}
      />
    </main>
  )
}
