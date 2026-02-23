import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ShareButton from '@/components/milestone/ShareButton'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: milestone } = await adminClient
    .from('milestones')
    .select('*, athletes(name), milestone_definitions(icon, label)')
    .eq('id', params.id)
    .single()

  if (!milestone) return { title: 'Milestone Not Found' }

  const athleteName = (milestone.athletes as any)?.name ?? 'Athlete'
  const label = milestone.label
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://runsosg.vercel.app'
  const imageUrl = `${appUrl}/api/milestone/${params.id}/image`

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
  const { data: milestone } = await adminClient
    .from('milestones')
    .select('*, athletes(name), milestone_definitions(icon, label)')
    .eq('id', params.id)
    .single()

  if (!milestone) notFound()

  const coachId = (milestone as any).awarded_by ?? null
  const { data: coach } = coachId
    ? await adminClient.from('users').select('name').eq('id', coachId).single()
    : { data: null }

  const athleteName = (milestone.athletes as any)?.name ?? 'Athlete'
  const coachName = coach?.name ?? null
  const icon = (milestone.milestone_definitions as any)?.icon ?? '🏆'
  const label = milestone.label
  const date = new Date(milestone.achieved_at).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center p-6">
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
      </div>
    </div>
  )
}
