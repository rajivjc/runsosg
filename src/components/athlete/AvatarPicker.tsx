'use client'

import { useState, useCallback } from 'react'
import { setAthleteAvatar } from '@/app/my/[athleteId]/actions'

// ─── Avatar options ──────────────────────────────────────────────

const AVATAR_OPTIONS = [
  { key: '🏃', label: 'Runner' },
  { key: '🏃‍♂️', label: 'Man running' },
  { key: '🏃‍♀️', label: 'Woman running' },
  { key: '👟', label: 'Running shoe' },
  { key: '🏅', label: 'Medal' },
  { key: '🏆', label: 'Trophy' },
  { key: '⭐', label: 'Star' },
  { key: '💪', label: 'Strong' },
] as const

const AVATAR_FEEDBACKS = ['Nice!', 'Love it!', 'Great pick!', "That's you!"]

// ─── Props ───────────────────────────────────────────────────────

interface AvatarPickerProps {
  athleteId: string
  currentAvatar: string | null
  /** Theme ring class, e.g. 'ring-teal-400' */
  themeRing: string
  /** Theme text class, e.g. 'text-teal-700' */
  themeText: string
  /** Theme light background class, e.g. 'bg-teal-50' */
  themeBgLight: string
  /** Theme light border class, e.g. 'border-teal-200' */
  themeBorderLight: string
}

// ─── Component ───────────────────────────────────────────────────

export default function AvatarPicker({
  athleteId,
  currentAvatar,
  themeRing,
  themeText,
  themeBgLight,
  themeBorderLight,
}: AvatarPickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar ?? '🏃')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarFeedback, setAvatarFeedback] = useState<string | null>(null)
  const [avatarBounce, setAvatarBounce] = useState(false)

  const handleAvatarChange = useCallback(async (avatar: string) => {
    setSelectedAvatar(avatar)
    setAvatarFeedback(null)
    setAvatarBounce(true)
    setTimeout(() => setAvatarBounce(false), 200)
    const result = await setAthleteAvatar(athleteId, avatar)
    if (result.success) {
      const feedback = AVATAR_FEEDBACKS[Math.floor(Math.random() * AVATAR_FEEDBACKS.length)]
      setAvatarFeedback(feedback)
      setTimeout(() => setAvatarFeedback(null), 2500)
    }
  }, [athleteId])

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setShowAvatarPicker(p => !p)}
        className={`w-[84px] h-[84px] mx-auto rounded-full ${themeBgLight} flex items-center justify-center border-4 ${themeBorderLight} transition-transform duration-200 motion-reduce:transition-none ${avatarBounce ? 'scale-110' : 'scale-100'}`}
        aria-label="Choose your avatar"
      >
        <span className="text-[44px] leading-none">{selectedAvatar}</span>
      </button>
      <p
        className={`text-xs mt-1.5 ${themeText} opacity-70 cursor-pointer`}
        onClick={() => setShowAvatarPicker(p => !p)}
      >
        Tap to change
      </p>

      {/* Inline avatar picker */}
      {showAvatarPicker && (
        <div className="mt-4">
          <div
            role="radiogroup"
            aria-label="Pick your avatar"
            className="inline-grid grid-cols-4 gap-3"
          >
            {AVATAR_OPTIONS.map(opt => {
              const isSelected = selectedAvatar === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={opt.label}
                  onClick={() => handleAvatarChange(opt.key)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 motion-reduce:transition-none ${
                    isSelected
                      ? `ring-2 ${themeRing} ${themeBgLight} scale-105 motion-reduce:scale-100`
                      : 'bg-white hover:bg-gray-50 ring-1 ring-gray-200'
                  }`}
                >
                  {opt.key}
                </button>
              )
            })}
          </div>
          {avatarFeedback && (
            <p
              className={`text-sm font-medium ${themeText} mt-2 animate-fade-in`}
              aria-live="polite"
            >
              {avatarFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
