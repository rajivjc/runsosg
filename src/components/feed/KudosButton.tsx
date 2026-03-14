'use client'

import { useState, useTransition } from 'react'
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
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Prevent rapid double-taps while a request is in-flight
    if (isPending) return

    // Optimistic update
    const newGiven = !given
    setGiven(newGiven)
    setCount(c => newGiven ? c + 1 : Math.max(0, c - 1))

    if (newGiven) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 600)
    }

    startTransition(async () => {
      const result = await toggleKudos(sessionId)
      if (result.error) {
        // Revert on error
        setGiven(!newGiven)
        setCount(c => newGiven ? Math.max(0, c - 1) : c + 1)
      } else {
        setGiven(result.given)
        setCount(result.count)
      }
    })
  }

  // Build giver summary text
  const names = giverNames ?? []
  const displayNames = names.slice(0, 3)
  const extraCount = names.length > 3 ? names.length - 3 : 0

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full transition-all duration-150 select-none min-h-[36px] ${
          given
            ? 'bg-red-50 text-red-500 border border-red-200 px-3 py-2 active:bg-red-100 active:scale-[0.95]'
            : 'bg-gray-50 text-gray-400 border border-gray-200 px-3 py-2 hover:bg-red-50 hover:text-red-400 hover:border-red-200 active:bg-red-100 active:scale-[0.95]'
        } ${animating ? 'scale-110' : ''}`}
        title={given ? 'Remove high five' : 'Give a high five'}
        aria-label={given ? 'Remove high five' : 'Give a high five'}
      >
        <span className={`text-sm transition-transform ${animating ? 'animate-bounce' : ''}`}>
          {given ? '🙌' : '👋'}
        </span>
        {count > 0 && <span>{count}</span>}
      </button>
      {count > 0 && displayNames.length > 0 && (
        <span className="text-[10px] text-gray-400 leading-tight">
          {displayNames.join(', ')}{extraCount > 0 ? ` +${extraCount}` : ''}
        </span>
      )}
    </div>
  )
}
