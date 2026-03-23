import { ImageResponse } from '@vercel/og'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getClub } from '@/lib/club'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ip = getClientIp(request)
  const rl = checkRateLimit(`og-image:${ip}`, 30, 60)
  if (!rl.success) {
    return new Response('Too many requests', { status: 429 })
  }

  const { data: rawMilestone } = await adminClient
    .from('milestones')
    .select('*, athletes(name), milestone_definitions(icon, label)')
    .eq('id', params.id)
    .single()

  if (!rawMilestone) {
    return new Response('Milestone not found', { status: 404 })
  }

  const milestone = rawMilestone as typeof rawMilestone & {
    athletes: { name: string } | null
    milestone_definitions: { icon: string; label: string } | null
  }

  const club = await getClub()
  const athleteName = milestone.athletes?.name ?? 'Athlete'
  const icon = milestone.milestone_definitions?.icon ?? '🏆'
  const label = milestone.label
  const date = new Date(milestone.achieved_at).toLocaleDateString(club.locale ?? 'en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0D9488 0%, #059669 50%, #047857 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            borderRadius: '32px',
            padding: '60px 80px',
            maxWidth: '900px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <span style={{ fontSize: '96px', marginBottom: '16px' }}>{icon}</span>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0D9488',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: '12px',
            }}
          >
            Milestone Achieved
          </p>
          <p
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            {athleteName}
          </p>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#0D9488',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            {label}
          </p>
          <div
            style={{
              width: '60px',
              height: '3px',
              backgroundColor: '#99F6E4',
              marginBottom: '24px',
            }}
          />
          <p
            style={{
              fontSize: '16px',
              color: '#9CA3AF',
              marginBottom: '32px',
            }}
          >
            {date}
          </p>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#D1D5DB',
              textTransform: 'uppercase',
              letterSpacing: '3px',
            }}
          >
            {club.name} — {club.tagline ?? 'Growing Together'}
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  )
}
