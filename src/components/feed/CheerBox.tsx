'use client'

import { useState, useTransition } from 'react'
import { sendCheer } from '@/app/feed/cheer-actions'

const PRESETS = [
  'Go {name}! 🎉',
  'You got this! 💪',
  'We\'re cheering from home! 🏠',
  'Have a great run! 🏃',
]

type Props = {
  athleteId: string
  athleteFirstName: string
  alreadySentToday: boolean
}

export default function CheerBox({ athleteId, athleteFirstName, alreadySentToday }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const [sent, setSent] = useState(alreadySentToday)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSend(message: string) {
    setError(null)
    startTransition(async () => {
      const result = await sendCheer(athleteId, message)
      if (result.error) {
        setError(result.error)
      } else {
        setSent(true)
        setShowCustom(false)
        setCustomText('')
      }
    })
  }

  if (sent) {
    return (
      <div className="bg-white/50 rounded-lg px-3 py-2.5 text-center">
        <p className="text-xs text-amber-700 font-medium">🎉 Cheer sent! You&apos;ll see a &#10003; when your coach has seen it.</p>
      </div>
    )
  }

  const presets = PRESETS.map(p => p.replace('{name}', athleteFirstName))

  return (
    <div>
      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Send a cheer</p>
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((msg, i) => (
          <button
            key={i}
            onClick={() => handleSend(msg)}
            disabled={isPending}
            className="bg-white/70 hover:bg-white border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
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
            className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white/70"
          />
          <button
            onClick={() => handleSend(customText)}
            disabled={isPending || !customText.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {isPending ? '...' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}
