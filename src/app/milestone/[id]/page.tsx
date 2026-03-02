import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'

interface PageProps {
  params: { id: string }
}

const getMilestone = cache(async (id: string) => {
  const { data } = await adminClient
    .from('milestones')
    .select('*, athletes(name, allow_public_sharing), milestone_definitions(icon, label)')
    .eq('id', id)
    .single()
  return data
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const milestone = await getMilestone(params.id)

  if (!milestone) return { title: 'Milestone Not Found' }

  const isPublic = (milestone.athletes as any)?.allow_public_sharing === true
  const athleteName = (milestone.athletes as any)?.name ?? 'Athlete'
  const label = milestone.label
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const imageUrl = `${appUrl}/api/milestone/${params.id}/image`

  if (!isPublic) {
    return {
      title: 'Private — SOSG Running Club',
      robots: { index: false, follow: false },
    }
  }

  return {
    title: `${athleteName} — ${label} | SOSG Running Club`,
    description: `${athleteName} achieved a milestone: ${label}. Growing together at SOSG Running Club.`,
    openGraph: {
      title: `${athleteName} — ${label}`,
      description: `${athleteName} achieved a milestone: ${label}. Growing together at SOSG Running Club.`,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${athleteName} - ${label}` }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${athleteName} — ${label}`,
      description: `${athleteName} achieved a milestone: ${label}. Growing together.`,
      images: [imageUrl],
    },
  }
}

export default async function MilestoneSharePage({ params }: PageProps) {
  const milestone = await getMilestone(params.id)

  if (!milestone) notFound()

  const isPublic = (milestone.athletes as any)?.allow_public_sharing === true
  if (!isPublic) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
          <span className="text-5xl mb-4">🔒</span>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This profile is private</h1>
          <p className="text-sm text-gray-500 mb-6">
            This athlete&apos;s milestones are not publicly shared.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-full px-6 py-3 transition-colors"
          >
            Sign in
          </Link>
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mt-6">SOSG Running Club</p>
        </div>
      </div>
    )
  }

  const coachId = (milestone as any).awarded_by ?? null
  const { data: coach } = coachId
    ? await adminClient.from('users').select('name').eq('id', coachId).single()
    : { data: null }

  const athleteName = (milestone.athletes as any)?.name ?? 'Athlete'
  const coachName = coach?.name ?? null
  const icon = (milestone.milestone_definitions as any)?.icon ?? '🏆'
  const label = milestone.label
  const date = new Date(milestone.achieved_at).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore'
  })

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
      <Link href="/feed" className="absolute top-4 left-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors min-h-[44px] min-w-[44px] px-2">
        ← Home
      </Link>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center text-center">
        <span className="text-7xl mb-4">{icon}</span>
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">Milestone Achieved</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{athleteName}</h1>
        <p className="text-xl font-semibold text-teal-600 mb-6">{label}</p>
        <div className="w-12 h-0.5 bg-teal-200 mb-6" />
        <p className="text-sm text-gray-400 mb-1">{date}</p>
        {coachName && (
          <p className="text-sm text-gray-400">Coached by {coachName}</p>
        )}
        <div className="mt-8 pt-6 border-t border-gray-100 w-full flex flex-col items-center gap-4">
          <ShareButton
            title={`${athleteName} — ${label}`}
            text={`${athleteName} achieved a milestone: ${label}. Growing together at SOSG Running Club!`}
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/milestone/${params.id}`}
          />
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest">SOSG Running Club — Growing Together</p>
        </div>
        <p className="text-[10px] text-white/40 text-center mt-4 max-w-xs">
          This page shows {athleteName}&apos;s running achievements only. No personal details, notes, or contact information are included.
        </p>
      </div>
    </div>
  )
}
