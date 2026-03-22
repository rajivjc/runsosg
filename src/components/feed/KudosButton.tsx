'use client'

import { useState, useRef } from 'react'
import { toggleKudos } from '@/app/feed/actions'

type Props = {
  sessionId: string
  initialCount: number
  initialGiven: boolean
  giverNames?: string[]
}

export default function KudosButton({ sessionId, initialCount, initialGiven, giverNames }: Props) {
  const [count, setCount] = useState(initialCount)
  const [given, setGiven] = useState(initialGiven)
  const [animating, setAnimating] = useState(false)
  const pendingRef = useRef(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (pendingRef.current) return
    pendingRef.current = true

    // Optimistic update
    const newGiven = !given
    setGiven(newGiven)
    setCount(c => newGiven ? c + 1 : Math.max(0, c - 1))

    if (newGiven) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 600)
    }

    toggleKudos(sessionId).then(result => {
      if (result.error) {
        // Revert on error
        setGiven(!newGiven)
        setCount(c => newGiven ? Math.max(0, c - 1) : c + 1)
      } else {
        setGiven(result.given)
        setCount(result.count)
      }
      pendingRef.current = false
    })
  }

  // Build giver summary
  const names = giverNames ?? []
  const displayNames = names.slice(0, 3)
  const extraCount = names.length > 3 ? names.length - 3 : 0

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full transition-all duration-150 select-none min-h-[36px] ${
          given
            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-400/20 px-3 py-2 active:bg-red-100 active:scale-[0.95]'
            : 'bg-surface-raised text-text-hint border border-border px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/15 hover:text-red-400 hover:border-red-200 dark:hover:border-red-400/20 active:bg-red-100 active:scale-[0.95]'
        } ${animating ? 'scale-110' : ''}`}
        title={given ? 'Remove high five' : 'Give a high five'}
      >
        <span className={`text-sm transition-transform ${animating ? 'animate-bounce' : ''}`}>
          {given ? '🙌' : '👋'}
        </span>
        {count > 0 && <span>{count}</span>}
        <span className="sr-only">{given ? 'Remove high five' : 'Give a high five'}</span>
      </button>
      {count > 0 && displayNames.length > 0 && (
        <div className="flex items-center" aria-label={`High fives from ${names.join(', ')}`}>
          {displayNames.map((name, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-alt border-2 border-white text-[10px] font-bold text-text-muted ${i > 0 ? '-ml-1.5' : ''}`}
              title={name}
              aria-hidden="true"
            >
              {name.charAt(0).toUpperCase()}
            </span>
          ))}
          {extraCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-alt border-2 border-white text-[10px] font-bold text-text-muted -ml-1.5"
              aria-hidden="true"
            >
              +{extraCount}
            </span>
          )}
          <span className="sr-only">
            {names.join(', ')}{extraCount > 0 ? ` and ${extraCount} more` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
