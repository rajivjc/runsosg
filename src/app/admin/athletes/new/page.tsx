import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AddAthleteForm from '@/components/admin/AddAthleteForm'

export async function generateMetadata(): Promise<Metadata> {
  const { getClub } = await import('@/lib/club')
  const club = await getClub()
  return { title: `Add Athlete — ${club.name}` }
}

export default async function NewAthletePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/athletes')

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <Link
        href="/athletes"
        className="inline-flex items-center gap-1 text-sm text-teal-600 dark:text-teal-300 mb-6"
      >
        ← Athletes
      </Link>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Add athlete</h1>
      <AddAthleteForm />
    </main>
  )
}
