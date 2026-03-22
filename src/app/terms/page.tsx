import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — SOSG Running Club',
  description: 'Terms of service for using the SOSG Running Club Hub.',
}

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6 py-12">
      <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-2xl px-8 py-10 sm:px-12 sm:py-14">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/login"
            className="text-sm text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
          >
            &larr; Back to login
          </Link>
        </div>

        {/* Section label */}
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-4">
          Terms
        </p>

        {/* Title */}
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-text-hint mb-8">
          Last updated: 21 March 2026
        </p>

        {/* Short version summary */}
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl px-6 py-5 mb-10">
          <p className="text-base font-semibold text-teal-800 dark:text-teal-300 mb-3">
            The short version
          </p>
          <ul className="space-y-2 text-base text-teal-700 dark:text-teal-300">
            <li>This app is a volunteer project for SOSG Running Club.</li>
            <li>Use it respectfully and honestly.</li>
            <li>
              Do not share other people&apos;s information outside the app.
            </li>
            <li>
              We do our best but cannot guarantee the app will always be
              available.
            </li>
            <li>Photos and content you upload remain yours.</li>
          </ul>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8 text-base text-text-secondary leading-relaxed">
          {/* What this app is */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              What this app is
            </h2>
            <p>
              SOSG Running Club Hub is a free, volunteer-built tool for managing
              running sessions for athletes with intellectual and developmental
              disabilities.
            </p>
            <p className="mt-3">
              It is not a medical tool, therapy tool, or official Special
              Olympics platform.
            </p>
          </section>

          {/* Who can use it */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Who can use it
            </h2>
            <p>
              Only people invited by a club admin can use this app. This includes
              coaches, caregivers, and athletes (via PIN).
            </p>
          </section>

          {/* Your responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Your responsibilities
            </h2>
            <ul className="space-y-2 list-disc list-inside text-text-secondary">
              <li>Log accurate information.</li>
              <li>
                Do not share athletes&apos; personal information (medical notes,
                photos, session data) outside the app without consent.
              </li>
              <li>Respect athletes&apos; privacy and dignity.</li>
              <li>Report any concerns to a club admin.</li>
            </ul>
          </section>

          {/* Athlete data */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Athlete data
            </h2>
            <p>
              Coaches and admins are responsible for ensuring athlete data is
              accurate and appropriate. Medical notes and communication notes
              should be kept current.
            </p>
            <p className="mt-3">
              Caregivers can disable public sharing for their linked athlete.
            </p>
          </section>

          {/* Photos and content */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Photos and content
            </h2>
            <p>
              Photos uploaded to the app remain the property of the person who
              took them. By uploading, you confirm you have permission to share
              the photo within the club.
            </p>
            <p className="mt-3">
              The app may display photos on public milestone and story pages only
              when sharing is enabled.
            </p>
          </section>

          {/* Availability */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Availability
            </h2>
            <p>
              This is a volunteer project. We aim to keep it running but cannot
              guarantee uptime. We may update, change, or discontinue features.
            </p>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Limitation of liability
            </h2>
            <p>
              This app is provided as-is. We are not liable for data loss or
              service interruptions. This app does not replace professional
              medical, therapeutic, or coaching advice.
            </p>
          </section>

          {/* Changes to these terms */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Changes to these terms
            </h2>
            <p>
              We will update this page when the terms change. The date at the
              top shows when they were last updated.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-border-subtle text-center">
          <p className="text-sm text-text-hint">
            Last updated: 21 March 2026
          </p>
          <p className="text-sm text-text-muted mt-2">
            <Link
              href="/privacy"
              className="text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 font-medium underline"
            >
              Privacy Policy
            </Link>
          </p>
          <p className="text-xs text-text-hint font-medium uppercase tracking-widest mt-4">
            SOSG Running Club
          </p>
        </div>
      </div>
    </div>
  )
}
