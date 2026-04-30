'use client'

interface PhoneFrameProps {
  children: React.ReactNode
}

const FRAME_BG = '#FBF9F7'

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div style={{
      width: 320, minHeight: 580, maxHeight: 640,
      background: FRAME_BG, borderRadius: 32,
      border: '3px solid #2C2C2A', position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, color: '#3d3d3a', letterSpacing: 0.3,
        background: FRAME_BG, position: 'relative', zIndex: 2,
      }}>
        <span>9:41</span>
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 22, background: '#2C2C2A', borderRadius: 12,
        }} />
      </div>
      <div style={{ height: 'calc(100% - 44px)', overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          background: 'linear-gradient(to bottom, transparent, white)',
          pointerEvents: 'none',
          borderRadius: '0 0 32px 32px',
        }}
      />
    </div>
  )
}
