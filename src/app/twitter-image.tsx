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
            d="M80 160 C180 160, 260 210, 360 256"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M60 256 C160 256, 260 256, 400 256"
            stroke="white"
            strokeWidth="32"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 352 C180 352, 260 302, 360 256"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="400" cy="256" r="18" fill="white" />
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

        {/* Domain */}
        <p
          style={{
            fontSize: '22px',
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.7)',
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
