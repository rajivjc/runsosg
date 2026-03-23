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

  const [
    { data: athlete },
    { count: sessionCount },
    { count: milestoneCount },
  ] = await Promise.all([
    adminClient
      .from('athletes')
      .select('name, allow_public_sharing')
      .eq('id', params.id)
      .single(),
    adminClient
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', params.id)
      .eq('status', 'completed'),
    adminClient
      .from('milestones')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', params.id),
  ])

  if (!athlete || !athlete.allow_public_sharing) {
    return new Response('Not found', { status: 404 })
  }

  const club = await getClub()

  const { data: distanceRows } = await adminClient
    .from('sessions')
    .select('distance_km')
    .eq('athlete_id', params.id)
    .eq('status', 'completed')

  const totalKm = (distanceRows ?? []).reduce((sum, s) => sum + (s.distance_km ?? 0), 0)

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
          <span style={{ fontSize: '72px', marginBottom: '16px' }}>🏃</span>
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
            Running Journey
          </p>
          <p
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            {athlete.name}
          </p>
          <div style={{ display: 'flex', gap: '40px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {sessionCount ?? 0}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>runs</p>
            </div>
            <div style={{ width: '1px', height: '50px', backgroundColor: '#E5E7EB' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {totalKm.toFixed(1)}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>km</p>
            </div>
            <div style={{ width: '1px', height: '50px', backgroundColor: '#E5E7EB' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {milestoneCount ?? 0}
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>milestones</p>
            </div>
          </div>
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
