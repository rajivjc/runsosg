'use client'

import { useState, useEffect, useCallback } from 'react'

interface CheerItem {
  id: string
  message: string
}

interface Props {
  cheers: CheerItem[]
  onViewed: (cheerIds: string[]) => void
}

/**
 * Bottom toast notifications for newly received cheers.
 * Slides in gently (or simply appears if reduced-motion is active).
 * Auto-dismisses after 5 seconds per cheer, with staggered display.
 */
export default function CheerToast({ cheers, onViewed }: Props) {
  const [visibleIndex, setVisibleIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const currentCheer = cheers[visibleIndex]

  const dismissCurrent = useCallback(() => {
    if (visibleIndex < cheers.length - 1) {
      setVisibleIndex(prev => prev + 1)
    } else {
      setDismissed(true)
    }
  }, [visibleIndex, cheers.length])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (dismissed || !currentCheer) return
    const timer = setTimeout(dismissCurrent, 5000)
    return () => clearTimeout(timer)
  }, [visibleIndex, dismissed, currentCheer, dismissCurrent])

  // Mark all cheers as viewed on mount
  useEffect(() => {
    if (cheers.length > 0) {
      onViewed(cheers.map(c => c.id))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to dismiss
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissCurrent()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dismissCurrent])

  if (dismissed || !currentCheer) return null

  return (
    <div
      className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-80 z-40 cheer-toast-enter"
      role="status"
      aria-live="polite"
    >
      <div
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/20 rounded-xl px-4 py-3 shadow-lg cursor-pointer"
        onClick={dismissCurrent}
      >
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
          Cheers from home
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          &ldquo;{currentCheer.message}&rdquo;
        </p>
        {cheers.length > 1 && (
          <p className="text-[10px] text-amber-400 mt-1">
            {visibleIndex + 1} of {cheers.length}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .cheer-toast-enter {
          animation: slideUp 200ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .cheer-toast-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
