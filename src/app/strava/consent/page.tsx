import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logStravaConsent } from './actions'

export const metadata = {
  title: 'Connect Strava',
}

export default async function StravaConsentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg-primary">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-text-primary mb-3">
            Connect your Strava account
          </h1>

          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            By connecting your Strava account, your run data (distance,
            duration, heart rate, and activity title) will be visible to the
            athletes you match and their caregivers within your Kita club.
          </p>

          <form action={logStravaConsent}>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#FC4C02] hover:bg-[#e04400] active:scale-[0.98] text-white text-sm font-semibold py-3 px-4 transition-all duration-150"
              style={{ minHeight: '44px' }}
            >
              Connect with Strava
            </button>
          </form>

          <a
            href="/account"
            className="block text-center text-sm text-text-secondary hover:text-text-primary mt-4 py-2 transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>
    </main>
  )
}
