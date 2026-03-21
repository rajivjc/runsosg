import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'
import CloseButton from '@/components/milestone/CloseButton'

export const metadata: Metadata = {
  title: 'Our Running Club — SOSG Running Club',
  description:
    'This app exists because every run deserves to be remembered.',
  openGraph: {
    title: 'Our Running Club — SOSG Running Club',
    description:
      'This app exists because every run deserves to be remembered.',
    type: 'article',
  },
}

export default function CaregiverAboutPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6 py-12">
      <CloseButton />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl px-8 py-10 sm:px-12 sm:py-14">
        {/* Section label */}
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-4">
          About
        </p>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Our Running Club
        </h1>

        {/* Body */}
        <div className="space-y-5 text-base text-gray-700 leading-relaxed">
          <p>
            This app exists because every run deserves to be remembered.
          </p>

          <p>
            Not just the distance. The personal bests, the tough sessions, the
            breakthroughs, and the days you showed up even when it was hard. All
            of it matters.
          </p>

          <p>
            Coaches can track sessions, write notes, and celebrate milestones.
            Caregivers can follow the journey and cheer from home. Athletes can
            see their progress, check in with their coach, and own their story.
          </p>

          <p>
            We&apos;re all here because of running. This app is how we stay
            connected between sessions.
          </p>

          <p>
            Great run today.
          </p>
        </div>

        {/* Divider */}
        <div className="w-12 h-0.5 bg-teal-200 mx-auto my-8" />

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <ShareButton
            title="Our Running Club — SOSG Running Club"
            text="This app exists because every run deserves to be remembered."
            url={`${appUrl}/about/caregiver`}
            buttonText="Share this"
          />
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">
            SOSG Running Club — Growing Together
          </p>
        </div>
      </div>
    </div>
  )
}
