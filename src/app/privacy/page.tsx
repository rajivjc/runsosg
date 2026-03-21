import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — SOSG Running Club',
  description:
    'How SOSG Running Club Hub collects, stores, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6 py-12">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl px-8 py-10 sm:px-12 sm:py-14">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/login"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            &larr; Back to login
          </Link>
        </div>

        {/* Section label */}
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-4">
          Privacy
        </p>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Last updated: 21 March 2026
        </p>

        {/* Short version summary */}
        <div className="bg-teal-50 rounded-2xl px-6 py-5 mb-10">
          <p className="text-base font-semibold text-teal-800 mb-3">
            The short version
          </p>
          <ul className="space-y-2 text-base text-teal-700">
            <li>We collect only what we need to run the app.</li>
            <li>Your data is stored securely in Singapore.</li>
            <li>We never sell or share your data with advertisers.</li>
            <li>
              Athletes&apos; medical information, coaching notes, and cues are
              never shown publicly.
            </li>
            <li>You can ask us to delete your data at any time.</li>
          </ul>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8 text-base text-gray-700 leading-relaxed">
          {/* Who we are */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Who we are
            </h2>
            <p>
              SOSG Running Club Hub is a volunteer-built tool for managing
              running sessions for athletes with intellectual and developmental
              disabilities. It helps coaches log runs, track progress, and
              celebrate achievements.
            </p>
            <p className="mt-3">
              For questions about your data, contact us at{' '}
              <span className="font-medium">privacy@sosg.run</span>.
            </p>
          </section>

          {/* What we collect and why */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              What we collect and why
            </h2>

            <p className="font-medium text-gray-800 mt-4 mb-2">
              Coaches and admins
            </p>
            <ul className="space-y-1 list-disc list-inside text-gray-700">
              <li>Email address (for login)</li>
              <li>Name</li>
              <li>
                Strava connection (OAuth tokens and activity data, only when you
                choose to connect)
              </li>
              <li>
                Push notification subscription (only when you enable
                notifications)
              </li>
            </ul>

            <p className="font-medium text-gray-800 mt-4 mb-2">Caregivers</p>
            <ul className="space-y-1 list-disc list-inside text-gray-700">
              <li>Email address (for login)</li>
              <li>Name</li>
              <li>Cheers messages you send</li>
            </ul>

            <p className="font-medium text-gray-800 mt-4 mb-2">Athletes</p>
            <ul className="space-y-1 list-disc list-inside text-gray-700">
              <li>Name and date of birth</li>
              <li>Photo (if uploaded by a coach)</li>
              <li>
                Running sessions (distance, duration, route, feel rating)
              </li>
              <li>Coaching cues and coach notes</li>
              <li>Communication notes and medical notes</li>
              <li>Emergency contact</li>
              <li>Mood check-ins</li>
              <li>Favourite runs, avatar choice, theme colour, and goal choice</li>
              <li>Messages to coaches</li>
              <li>
                PIN (stored as a one-way hash &mdash; we cannot read it)
              </li>
            </ul>
          </section>

          {/* What we do NOT collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              What we do not collect
            </h2>
            <p>
              We do not collect location data from athletes&apos; devices. GPS
              data comes only from coaches&apos; Strava activities.
            </p>
            <p className="mt-3">
              We do not use tracking cookies, advertising pixels, or analytics
              that identify individual users. If we add analytics in the future,
              we will update this policy first.
            </p>
          </section>

          {/* Where your data is stored */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Where your data is stored
            </h2>
            <ul className="space-y-1 list-disc list-inside text-gray-700">
              <li>
                <span className="font-medium">Supabase</span> &mdash; database
                and file storage, Singapore region
              </li>
              <li>
                <span className="font-medium">Vercel</span> &mdash; hosting,
                with edge servers
              </li>
              <li>
                <span className="font-medium">Resend</span> &mdash; email
                delivery
              </li>
            </ul>
            <p className="mt-3">
              All connections use HTTPS encryption.
            </p>
          </section>

          {/* Who can see what */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Who can see what
            </h2>

            <p className="font-medium text-gray-800 mt-4 mb-2">
              Coaches and admins
            </p>
            <p>
              Can see all athlete data, including sessions, cues, notes, medical
              info, and mood trends.
            </p>

            <p className="font-medium text-gray-800 mt-4 mb-2">Caregivers</p>
            <p>
              Can only see their linked athlete&apos;s sessions, milestones,
              goal progress, and public information. They cannot see medical
              notes, coaching cues, or coach-only notes.
            </p>

            <p className="font-medium text-gray-800 mt-4 mb-2">
              Athletes (via PIN-protected page)
            </p>
            <p>
              See their own runs, milestones, cheers, goal progress, and mood
              history. They never see medical notes, coaching cues, or coach
              notes.
            </p>

            <p className="font-medium text-gray-800 mt-4 mb-2">
              Public milestone and story pages
            </p>
            <p>
              When sharing is enabled, these pages show only the athlete&apos;s
              first name, milestones, and coach-selected story updates. They
              never show medical info, notes, cues, feel ratings, or disability
              details.
            </p>
          </section>

          {/* Strava integration */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Strava integration
            </h2>
            <p>
              When a coach connects Strava, we receive activity data (distance,
              duration, title, GPS polyline, heart rate) via Strava&apos;s API.
              We store OAuth tokens securely.
            </p>
            <p className="mt-3">
              Coaches can disconnect Strava at any time from their account page.
              We only access activities after the coach connects. We do not read
              historical data.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Cookies
            </h2>
            <p className="mb-3">We use essential cookies only:</p>
            <ul className="space-y-1 list-disc list-inside text-gray-700">
              <li>
                Supabase authentication cookies (keep you logged in, HttpOnly,
                Secure, 1-year expiry)
              </li>
              <li>
                Athlete session cookie (PIN authentication, HttpOnly, Secure,
                24-hour expiry)
              </li>
            </ul>
            <p className="mt-3">
              We do not use advertising or tracking cookies.
            </p>
          </section>

          {/* Data sharing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Data sharing
            </h2>
            <p>
              We do not sell data. We do not share data with advertisers. Data is
              shared only with the service providers listed above (Supabase,
              Vercel, Resend, Strava) to operate the app.
            </p>
          </section>

          {/* Data retention and deletion */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Data retention and deletion
            </h2>
            <p>
              Data is kept as long as the club uses the app. If an athlete
              leaves the club, an admin can deactivate their profile.
            </p>
            <p className="mt-3">
              To request full deletion of your data, contact{' '}
              <span className="font-medium">privacy@sosg.run</span>. We will
              respond within 30 days.
            </p>
          </section>

          {/* Children and young athletes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Children and young athletes
            </h2>
            <p>
              Some athletes may be under 18. We collect data about athletes only
              through authorised coaches and admins, never directly from minors.
            </p>
            <p className="mt-3">
              Caregivers can disable public sharing for their linked athlete at
              any time.
            </p>
          </section>

          {/* Changes to this policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Changes to this policy
            </h2>
            <p>
              We will update this page when the policy changes. The date at the
              top shows when it was last updated.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Contact
            </h2>
            <p>
              For questions about your data, email{' '}
              <span className="font-medium">privacy@sosg.run</span>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Last updated: 21 March 2026
          </p>
          <p className="text-sm text-gray-500 mt-2">
            <Link
              href="/terms"
              className="text-teal-600 hover:text-teal-700 font-medium underline"
            >
              Terms of Service
            </Link>
          </p>
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mt-4">
            SOSG Running Club
          </p>
        </div>
      </div>
    </div>
  )
}
