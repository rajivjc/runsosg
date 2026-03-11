'use client'

import { useEffect, useState, useCallback } from 'react'

interface Props {
  athleteName: string
  coachName: string
  onDismiss: () => void
}

/**
 * Warm acknowledgment overlay for the first run logged for an athlete.
 * Soft teal background, no confetti — just a calm, dignified moment.
 * Static display when prefers-reduced-motion is active.
 */
export default function FirstRunOverlay({ athleteName, coachName, onDismiss }: Props) {
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }, [onDismiss])

  useEffect(() => {
    const timer = setTimeout(dismiss, 5000)
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
      aria-label={`First run together: ${coachName} and ${athleteName}`}
    >
      {/* Soft teal backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-teal-600" />

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        aria-label="Close"
        className="absolute top-6 right-6 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl font-light transition-colors"
      >
        ✕
      </button>

      {/* Content */}
      <div className="relative text-center px-8">
        <div className="text-6xl mb-4">🤝</div>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-2">
          A new journey begins
        </p>
        <h2 className="text-2xl font-extrabold text-white mb-2">
          {coachName} &amp; {athleteName}
        </h2>
        <p className="text-lg text-white/90">
          First run together
        </p>
        <p className="text-white/40 text-xs mt-8">Tap anywhere to dismiss</p>
      </div>
    </div>
  )
}
