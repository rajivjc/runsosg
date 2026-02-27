import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ClubSettingsForm from '@/components/admin/ClubSettingsForm'

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

  const { data: settings } = await adminClient
    .from('club_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Admin
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Club Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
        <ClubSettingsForm
          name={settings?.name ?? 'SOSG Running Club'}
          homeLocation={settings?.home_location ?? null}
          sessionDay={settings?.session_day ?? null}
          sessionTime={settings?.session_time ?? null}
          stravaClubId={settings?.strava_club_id ?? null}
        />
      </div>
    </main>
  )
}
