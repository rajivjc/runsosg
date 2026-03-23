import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCoachDigestData, getCaregiverDigestData } from '@/lib/digest/data'
import { generateCoachNarrative, generateCaregiverNarrative } from '@/lib/digest/narrative'
import type { DigestNarrative, NarrativeParagraph } from '@/lib/digest/types'

export async function generateMetadata(): Promise<Metadata> {
  const { getClub } = await import('@/lib/club')
  const club = await getClub()
  return { title: `Weekly Notes — ${club.name}` }
}

export default async function DigestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (userRow?.role === 'coach' || userRow?.role === 'admin') {
    const data = await getCoachDigestData(user.id)
    if (!data) return <EmptyDigest />
    const narrative = generateCoachNarrative(data)
    return <DigestView narrative={narrative} role="coach" />
  }

  if (userRow?.role === 'caregiver') {
    const data = await getCaregiverDigestData(user.id)
    if (!data) return <EmptyDigest />
    const narrative = generateCaregiverNarrative(data)
    return <DigestView narrative={narrative} role="caregiver" />
  }

  redirect('/feed')
}

function EmptyDigest() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-base font-semibold text-text-primary mb-1">No notes this week</p>
        <p className="text-sm text-text-muted">
          Your weekly digest will appear here after sessions are logged.
        </p>
      </div>
    </main>
  )
}

function DigestView({ narrative, role }: { narrative: DigestNarrative; role: 'coach' | 'caregiver' }) {
  if (narrative.isEmpty && narrative.paragraphs.length === 0) {
    return <EmptyDigest />
  }

  const highlights = narrative.paragraphs.filter(p => p.type === 'highlight')
  const headsUp = narrative.paragraphs.filter(p => p.type === 'heads-up')
  const opening = narrative.paragraphs.find(p => p.type === 'opening')
  const closing = narrative.paragraphs.find(p => p.type === 'closing')

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Card wrapper */}
      <div className="bg-surface border border-border-subtle rounded-2xl px-6 py-6 shadow-sm">
        {/* Header */}
        <div className="mb-6">
          <p className="text-lg font-bold text-text-primary flex items-center gap-2">
            <span>📋</span> Your weekly notes
          </p>
          <p className="text-sm text-text-muted mt-0.5">{narrative.weekLabel}</p>
        </div>

        {/* Opening */}
        {opening && (
          <p className="text-base text-text-primary mb-6 leading-relaxed">{opening.text}</p>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <>
            <div className="border-t border-border-subtle my-6" />
            <p className="text-xs uppercase tracking-wide font-semibold text-text-hint mb-4 border-l-2 border-teal-400 pl-2">
              Highlights
            </p>
            <div className="space-y-4">
              {highlights.map((p, i) => (
                <HighlightParagraph key={i} paragraph={p} role={role} />
              ))}
            </div>
          </>
        )}

        {/* Heads up (coach only) */}
        {headsUp.length > 0 && (
          <>
            <div className="border-t border-border-subtle my-6" />
            <p className="text-xs uppercase tracking-wide font-semibold text-text-hint mb-4 border-l-2 border-amber-400 pl-2">
              Heads up
            </p>
            <div className="space-y-4">
              {headsUp.map((p, i) => (
                <HeadsUpParagraph key={i} paragraph={p} />
              ))}
            </div>
          </>
        )}

        {/* Closing */}
        {closing && (
          <>
            <div className="border-t border-border-subtle my-6" />
            <div className="bg-surface-alt rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-text-muted">{closing.text}</p>
            </div>
          </>
        )}
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/feed"
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          &larr; Back to feed
        </Link>
      </div>
    </main>
  )
}

function HighlightParagraph({ paragraph, role }: { paragraph: NarrativeParagraph; role: 'coach' | 'caregiver' }) {
  const linkHref = paragraph.athleteId
    ? role === 'coach' ? `/athletes/${paragraph.athleteId}` : `/story/${paragraph.athleteId}`
    : null

  return (
    <div className="flex items-start gap-3">
      {/* Avatar circle — show athlete avatar or fallback to icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-base">
        {paragraph.avatar ?? paragraph.icon ?? '🏃'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-secondary leading-relaxed">{paragraph.text}</p>
        {paragraph.milestoneProgress && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-text-hint mb-1">
              <span>{paragraph.milestoneProgress.label}</span>
              <span>{paragraph.milestoneProgress.current} / {paragraph.milestoneProgress.target}</span>
            </div>
            <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((paragraph.milestoneProgress.current / paragraph.milestoneProgress.target) * 100))}%` }}
              />
            </div>
          </div>
        )}
        {linkHref && paragraph.athleteName && (
          <Link
            href={linkHref}
            className="text-xs text-teal-600 dark:text-teal-300 hover:text-teal-700 mt-1 inline-block"
          >
            View {paragraph.athleteName} &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}

function HeadsUpParagraph({ paragraph }: { paragraph: NarrativeParagraph }) {
  return (
    <div className="border-l-2 border-amber-400 pl-3">
      <div className="flex items-start gap-3">
        {paragraph.icon && (
          <span className="text-base flex-shrink-0 mt-0.5">{paragraph.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary leading-relaxed">{paragraph.text}</p>
          {paragraph.athleteId && paragraph.athleteName && (
            <Link
              href={`/athletes/${paragraph.athleteId}`}
              className="text-xs text-teal-600 dark:text-teal-300 hover:text-teal-700 mt-1 inline-block"
            >
              View {paragraph.athleteName} &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
