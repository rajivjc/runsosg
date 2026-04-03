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
            Runs must be set to Everyone or Followers visibility on Strava to
            sync with Kita. Runs set to Only Me will not be matched.
          </p>

          <form action={logStravaConsent} className="flex justify-center">
            <button
              type="submit"
              className="active:scale-[0.98] transition-transform duration-150 bg-transparent border-none p-0 cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Strava brand asset must not be altered */}
              <img
                src="/assets/strava/btn_strava_connect_with_orange.png"
                srcSet="/assets/strava/btn_strava_connect_with_orange.png 1x, /assets/strava/btn_strava_connect_with_orange_x2.png 2x"
                alt="Connect with Strava"
                width={193}
                height={48}
                style={{ display: 'block' }}
              />
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
