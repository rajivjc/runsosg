import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import WelcomeForm from './welcome-form'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  // If user already has a name, skip to feed
  if (userRow?.name) {
    redirect('/feed')
  }

  const role = userRow?.role ?? 'coach'

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-raised px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface rounded-2xl shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-teal-600 dark:text-teal-300">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome to SOSG Running Club!
            </h1>
            <p className="text-sm text-text-muted mt-2">
              {role === 'coach'
                ? "Let\u2019s get you set up for coaching."
                : role === 'caregiver'
                ? "You\u2019re all set to follow your athlete\u2019s journey."
                : "Let\u2019s get you started."}
            </p>
          </div>

          <WelcomeForm role={role} />
        </div>
      </div>
    </main>
  )
}
