import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ClubSettingsForm from '@/components/admin/ClubSettingsForm'
import { getClub } from '@/lib/club'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Club Settings — ${club.name}` }
}

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/athletes')

  const club = await getClub()

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
      >
        <ChevronLeft size={16} />
        Admin
      </Link>

      <h1 className="text-2xl font-bold text-text-primary">Club Settings</h1>

      <div className="bg-surface border border-border rounded-xl px-4 py-4">
        <ClubSettingsForm
          name={club.name}
          homeLocation={club.home_location}
          sessionDay={club.session_day}
          sessionTime={club.session_time}
          stravaClubId={club.strava_club_id}
          tagline={club.tagline}
          timezone={club.timezone ?? 'Asia/Singapore'}
          locale={club.locale}
          stravaHashtagPrefix={club.strava_hashtag_prefix}
        />
      </div>
    </main>
  )
}
