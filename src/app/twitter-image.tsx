import { ImageResponse } from '@vercel/og'

export const runtime = 'nodejs'
export const alt = 'Kita — The running app where every athlete belongs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Three-paths-converging logo mark */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 512 512"
          fill="none"
          style={{ marginBottom: '32px' }}
        >
          <path
            d="M100 190 C180 190, 240 230, 380 256"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M110 256 C200 256, 300 256, 390 256"
            stroke="white"
            strokeWidth="30"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M100 322 C180 322, 240 282, 380 256"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="390" cy="256" r="16" fill="white" />
        </svg>

        {/* Main text */}
        <p
          style={{
            fontSize: '44px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            margin: '0 80px 24px',
            maxWidth: '900px',
          }}
        >
          The running app where every athlete belongs
        </p>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '22px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            margin: '0 0 32px',
            letterSpacing: '0.5px',
          }}
        >
          For coaches · caregivers · athletes
        </p>

        {/* Domain */}
        <p
          style={{
            fontSize: '20px',
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.5)',
            margin: 0,
            letterSpacing: '1px',
          }}
        >
          kitarun.com
        </p>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  )
}
