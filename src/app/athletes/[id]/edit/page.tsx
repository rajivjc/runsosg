import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import EditAthleteForm from '@/components/athlete/EditAthleteForm'
import DeleteAthleteButton from '@/components/admin/DeleteAthleteButton'
import { updateAthlete } from '../actions'

interface PageProps {
  params: { id: string }
}

export default async function EditAthletePage({ params }: PageProps) {
  const { id } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/athletes')

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, name, date_of_birth, running_goal, communication_notes, medical_notes, emergency_contact, photo_url, active')
    .eq('id', id)
    .single()

  if (!athlete) notFound()

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateAthlete(id, formData)
    if (!result.error) {
      redirect(`/athletes/${id}`)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <Link
        href={`/athletes/${id}`}
        className="inline-flex items-center gap-1 text-sm text-teal-600 mb-6"
      >
        ← {athlete.name}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit profile</h1>
      <EditAthleteForm athlete={athlete} onUpdate={handleUpdate} />

      <div className="mt-10 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Danger zone</p>
        <DeleteAthleteButton athleteId={id} athleteName={athlete.name} />
      </div>
    </main>
  )
}
