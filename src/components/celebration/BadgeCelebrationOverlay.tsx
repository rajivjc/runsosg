'use client'

import { useEffect, useState, useCallback } from 'react'

interface BadgeInfo {
  key: string
  label: string
  description: string
  icon: string
}

interface Props {
  badge: BadgeInfo
  onDismiss: () => void
}

/**
 * Full-screen celebration overlay for coach badge achievements.
 * Warm amber/gold gradient (distinct from teal milestone celebrations).
 * Respects prefers-reduced-motion with static fallback.
 */
export default function BadgeCelebrationOverlay({ badge, onDismiss }: Props) {
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }, [onDismiss])

  useEffect(() => {
    const timer = setTimeout(dismiss, 6000)
    return () => clearTimeout(timer)
  }, [dismiss])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dismiss])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={dismiss}
      role="dialog"
      aria-label={`Badge earned: ${badge.label}`}
    >
      {/* Warm amber/gold backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600" />

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        aria-label="Close celebration"
        className="absolute top-6 right-6 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl font-light transition-colors"
      >
        ✕
      </button>

      {/* Content */}
      <div className="relative text-center px-8">
        <div className="text-7xl mb-4 badge-icon">{badge.icon}</div>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-2">
          Achievement unlocked
        </p>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          {badge.label}
        </h2>
        <p className="text-lg text-white/90 mb-4">
          {badge.description}
        </p>
        <p className="text-white/40 text-xs mt-6">Tap anywhere to dismiss</p>
      </div>

      <style jsx>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .badge-icon {
          animation: badgePulse 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .badge-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
