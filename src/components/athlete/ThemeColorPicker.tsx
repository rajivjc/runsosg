'use client'

import { useState, useCallback } from 'react'
import { setAthleteTheme } from '@/app/my/[athleteId]/actions'

// ─── Color picker options ────────────────────────────────────────

const COLOR_OPTIONS = [
  { key: 'teal', label: 'Teal', swatch: 'bg-teal-400' },
  { key: 'blue', label: 'Blue', swatch: 'bg-blue-400' },
  { key: 'purple', label: 'Purple', swatch: 'bg-purple-400' },
  { key: 'green', label: 'Green', swatch: 'bg-green-400' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-400' },
  { key: 'coral', label: 'Coral', swatch: 'bg-orange-400' },
]

// ─── Props ───────────────────────────────────────────────────────

interface ThemeColorPickerProps {
  athleteId: string
  selectedColor: string
  /** Theme text class, e.g. 'text-teal-700' */
  themeText: string
  /** Called immediately when the user picks a new color (parent updates theme) */
  onColorChange: (color: string) => void
}

// ─── Component ───────────────────────────────────────────────────

export default function ThemeColorPicker({
  athleteId,
  selectedColor,
  themeText,
  onColorChange,
}: ThemeColorPickerProps) {
  const [colorFeedback, setColorFeedback] = useState<string | null>(null)

  const handleColorChange = useCallback(async (color: string) => {
    onColorChange(color)
    setColorFeedback(null)
    const result = await setAthleteTheme(athleteId, color)
    if (result.success) {
      setColorFeedback('Nice choice!')
      setTimeout(() => setColorFeedback(null), 3000)
    }
  }, [athleteId, onColorChange])

  return (
    <section aria-label="Pick your color" className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span>🎨</span> Pick your color
      </h2>
      <div className="flex justify-between gap-2">
        {COLOR_OPTIONS.map(c => {
          const selected = selectedColor === c.key
          return (
            <button
              key={c.key}
              onClick={() => handleColorChange(c.key)}
              className={`w-14 h-14 rounded-full ${c.swatch} flex items-center justify-center transition-all
                ${selected ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-80'}`}
              aria-label={`${c.label}${selected ? ' (selected)' : ''}`}
              aria-pressed={selected}
            >
              {selected && <span className="text-white text-lg font-bold drop-shadow-sm">✓</span>}
            </button>
          )
        })}
      </div>
      <div aria-live="polite" className="mt-2 min-h-[1.25rem]">
        {colorFeedback && (
          <p className={`text-sm ${themeText} font-medium text-center`}>{colorFeedback}</p>
        )}
      </div>
    </section>
  )
}
