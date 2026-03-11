'use client'

import { useState, useTransition } from 'react'
import { sendCheer } from '@/app/feed/cheer-actions'

const MAX_CHEERS_PER_DAY = 3

const PRESETS = [
  'Go {name}! 🎉',
  'You got this! 💪',
  'We\'re cheering from home! 🏠',
  'Have a great run! 🏃',
]

type Props = {
  athleteId: string
  athleteFirstName: string
  cheersToday: number
}

export default function CheerBox({ athleteId, athleteFirstName, cheersToday: initialCheersToday }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const [cheersUsed, setCheersUsed] = useState(initialCheersToday)
  const [justSent, setJustSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const remaining = MAX_CHEERS_PER_DAY - cheersUsed

  function handleSend(message: string) {
    setError(null)
    startTransition(async () => {
      const result = await sendCheer(athleteId, message)
      if (result.error) {
        setError(result.error)
      } else {
        setCheersUsed(prev => prev + 1)
        setJustSent(true)
        setShowCustom(false)
        setCustomText('')
        // Reset "just sent" after a moment so they can send another
        setTimeout(() => setJustSent(false), 2000)
      }
    })
  }

  if (remaining <= 0 || (justSent && remaining <= 1)) {
    return (
      <div className="bg-white/50 rounded-lg px-3 py-2.5 text-center">
        <p className="text-xs text-amber-700 font-medium">🎉 All cheers sent today! Come back tomorrow.</p>
      </div>
    )
  }

  if (justSent) {
    return (
      <div className="bg-white/50 rounded-lg px-3 py-2.5 text-center">
        <p className="text-xs text-amber-700 font-medium">🎉 Cheer sent! You have {remaining - 1} left today.</p>
      </div>
    )
  }

  const presets = PRESETS.map(p => p.replace('{name}', athleteFirstName))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Send a cheer</p>
        <p className="text-[10px] text-amber-400">{remaining} left today</p>
      </div>
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((msg, i) => (
          <button
            key={i}
            onClick={() => handleSend(msg)}
            disabled={isPending}
            className="bg-white/70 hover:bg-white active:scale-95 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1.5 rounded-full transition-all duration-150 disabled:opacity-50"
          >
            {msg}
          </button>
        ))}
      </div>
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          className="text-[10px] text-amber-500 hover:text-amber-700 font-medium transition-colors"
        >
          Write your own...
        </button>
      ) : (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value.slice(0, 100))}
            placeholder="Type your cheer..."
            maxLength={100}
            autoFocus
            className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-xs transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.08)] bg-white/70"
          />
          <button
            onClick={() => handleSend(customText)}
            disabled={isPending || !customText.trim()}
            className="bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-xs font-semibold rounded-lg px-3 py-2 transition-all duration-150 disabled:opacity-50 flex-shrink-0"
          >
            {isPending ? '...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}
