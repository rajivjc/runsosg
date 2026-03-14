'use client'

import { useState, useTransition } from 'react'
import { sendCheer } from '@/app/feed/cheer-actions'

const MAX_CHEERS_PER_DAY = 3

const PRESETS = [
  { text: 'Go {name}!', emoji: '🎉' },
  { text: 'You got this!', emoji: '💪' },
  { text: 'We\'re cheering from home!', emoji: '🏠' },
  { text: 'Have a great run!', emoji: '🏃' },
]

type Props = {
  athleteId: string
  athleteFirstName: string
  cheersToday: number
}

export default function CheerBox({ athleteId, athleteFirstName, cheersToday: initialCheersToday }: Props) {
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
        setCustomText('')
        setTimeout(() => setJustSent(false), 2500)
      }
    })
  }

  if (remaining <= 0 || (justSent && remaining <= 1)) {
    return (
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl px-4 py-5 text-center border border-amber-100/60">
        <p className="text-2xl mb-1">🎉</p>
        <p className="text-sm font-medium text-gray-700">All cheers sent today!</p>
        <p className="text-xs text-gray-500 mt-0.5">Come back tomorrow to send more.</p>
      </div>
    )
  }

  if (justSent) {
    return (
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl px-4 py-5 text-center border border-amber-100/60">
        <p className="text-2xl mb-1">🎉</p>
        <p className="text-sm font-medium text-gray-700">Cheer sent!</p>
        <p className="text-xs text-gray-500 mt-0.5">{remaining - 1} left today.</p>
      </div>
    )
  }

  const presets = PRESETS.map(p => ({
    text: p.text.replace('{name}', athleteFirstName),
    emoji: p.emoji,
    full: p.text.replace('{name}', athleteFirstName) + ' ' + p.emoji,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{remaining} left today</p>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2 px-1">{error}</p>
      )}

      {/* Preset buttons — 2-column grid for larger touch targets */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {presets.map((msg, i) => (
          <button
            key={i}
            onClick={() => handleSend(msg.full)}
            disabled={isPending}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-amber-50 to-orange-50/60 hover:from-amber-100 hover:to-orange-100/60 active:scale-[0.97] border border-amber-200/80 text-gray-700 text-sm font-medium px-3 py-3 rounded-xl transition-all duration-150 disabled:opacity-50 min-h-[48px]"
          >
            <span className="text-base">{msg.emoji}</span>
            <span>{msg.text}</span>
          </button>
        ))}
      </div>

      {/* Custom message input — always visible */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value.slice(0, 100))}
          placeholder="Write your own message..."
          maxLength={100}
          className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300 focus:shadow-[0_0_0_3px_rgba(251,146,60,0.08)] bg-white placeholder:text-gray-400"
        />
        <button
          onClick={() => handleSend(customText)}
          disabled={isPending || !customText.trim()}
          className="bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-all duration-150 disabled:opacity-40 flex-shrink-0 min-h-[44px]"
        >
          {isPending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
