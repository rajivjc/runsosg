'use client'

import { useState, useCallback } from 'react'
import { saveAthleteMood } from '@/app/my/[athleteId]/actions'

// ─── Mood options ────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Sad' },
  { value: 2, emoji: '😴', label: 'Tired' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Happy' },
  { value: 5, emoji: '🤩', label: 'Excited' },
]

// ─── Props ───────────────────────────────────────────────────────

interface MoodCheckInProps {
  athleteId: string
  currentMood: number | null
  /** Theme ring class, e.g. 'ring-teal-400' */
  themeRing: string
  /** Theme text class, e.g. 'text-teal-700' */
  themeText: string
}

// ─── Component ───────────────────────────────────────────────────

export default function MoodCheckIn({
  athleteId,
  currentMood,
  themeRing,
  themeText,
}: MoodCheckInProps) {
  const [mood, setMood] = useState<number | null>(currentMood)
  const [moodFeedback, setMoodFeedback] = useState<string | null>(null)

  const handleMood = useCallback(async (value: number) => {
    setMood(value)
    setMoodFeedback(null)
    const result = await saveAthleteMood(athleteId, value)
    if (result.success) {
      setMoodFeedback('Got it!')
      setTimeout(() => setMoodFeedback(null), 3000)
    }
  }, [athleteId])

  return (
    <section aria-label="How are you feeling today" className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>😊</span> How are you feeling today?
      </h2>
      <div className="flex justify-between gap-2">
        {MOOD_OPTIONS.map(m => {
          const selected = mood === m.value
          return (
            <button
              key={m.value}
              onClick={() => handleMood(m.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all
                ${selected
                  ? `bg-white border-2 ${themeRing.replace('ring', 'border')} shadow-sm`
                  : 'bg-white/60 border-2 border-transparent hover:bg-white'
                }`}
              aria-label={m.label}
              aria-pressed={selected}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs text-gray-600">{m.label}</span>
            </button>
          )
        })}
      </div>
      <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
        {moodFeedback && (
          <p className={`text-sm ${themeText} font-medium text-center`}>{moodFeedback}</p>
        )}
      </div>
    </section>
  )
}
