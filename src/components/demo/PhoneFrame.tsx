'use client'

import { useEffect, useRef, useState } from 'react'

interface PhoneFrameProps {
  children: React.ReactNode
}

const FRAME_BG = '#FBF9F7'

export default function PhoneFrame({ children }: PhoneFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(false)
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      const reached = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      setAtBottom(reached)
    }
    update()

    const onScroll = () => {
      update()
      setHintVisible(false)
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    const timer = window.setTimeout(() => setHintVisible(false), 3000)

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [children])

  const fadeVisible = !atBottom

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
      <div ref={scrollRef} style={{ height: 'calc(100% - 44px)', overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 40, pointerEvents: 'none',
          background: `linear-gradient(to top, ${FRAME_BG}, rgba(251, 249, 247, 0))`,
          opacity: fadeVisible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 8,
          textAlign: 'center', fontSize: 11, fontWeight: 600,
          color: '#888780', letterSpacing: 0.4,
          pointerEvents: 'none',
          opacity: hintVisible && fadeVisible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      >
        Scroll to explore ↓
      </div>
    </div>
  )
}
