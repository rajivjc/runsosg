'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type CelebrationOverlayProps = {
  milestoneId: string
  athleteName: string
  milestoneLabel: string
  milestoneIcon: string
  onDismiss: () => void
}

/**
 * Full-screen celebration overlay for milestone achievements.
 * Shows confetti animation (CSS-only, respects prefers-reduced-motion),
 * large milestone icon, athlete name, and share link.
 * Auto-dismisses after 8 seconds or on tap.
 */
export default function CelebrationOverlay({
  milestoneId,
  athleteName,
  milestoneLabel,
  milestoneIcon,
  onDismiss,
}: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
    // Allow exit animation to complete
    setTimeout(onDismiss, 300)
  }, [onDismiss])

  useEffect(() => {
    const timer = setTimeout(dismiss, 8000)
    return () => clearTimeout(timer)
  }, [dismiss])

  // Close on Escape key
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
      aria-label={`Milestone celebration: ${milestoneLabel}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-emerald-700" />

      {/* Confetti — CSS-only, hidden for reduced motion */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none celebration-confetti" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>

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
        <div className="text-7xl mb-4 animate-bounce-slow">{milestoneIcon}</div>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-2">
          Milestone unlocked
        </p>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          {milestoneLabel}
        </h2>
        <p className="text-xl text-white/90 mb-8">
          {athleteName}
        </p>
        <Link
          href={`/milestone/${milestoneId}`}
          className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Share this moment
        </Link>
        <p className="text-white/40 text-xs mt-6">Tap anywhere to dismiss</p>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes bounceSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .confetti-piece {
          position: absolute;
          top: -10px;
          display: block;
          animation: confettiFall 3s ease-in forwards;
        }

        .animate-bounce-slow {
          animation: bounceSlow 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .celebration-confetti {
            display: none;
          }
          .animate-bounce-slow {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

const CONFETTI_COLORS = [
  '#F59E0B', // amber
  '#14B8A6', // teal
  '#EF4444', // red
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#EC4899', // pink
  '#10B981', // emerald
  '#F97316', // orange
]
