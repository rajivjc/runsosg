'use client'

import { useState, useTransition } from 'react'
import { toggleKudos } from '@/app/feed/actions'

type Props = {
  sessionId: string
  initialCount: number
  initialGiven: boolean
}

export default function KudosButton({ sessionId, initialCount, initialGiven }: Props) {
  const [count, setCount] = useState(initialCount)
  const [given, setGiven] = useState(initialGiven)
  const [animating, setAnimating] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

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

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-all ${
        given
          ? 'bg-red-50 text-red-500 border border-red-200'
          : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-400 hover:border-red-200'
      } ${animating ? 'scale-110' : ''}`}
      title={given ? 'Remove high five' : 'Give a high five'}
      aria-label={given ? 'Remove high five' : 'Give a high five'}
    >
      <span className={`transition-transform ${animating ? 'animate-bounce' : ''}`}>
        {given ? '🙌' : '👋'}
      </span>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
