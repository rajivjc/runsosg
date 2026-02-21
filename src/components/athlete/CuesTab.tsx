'use client'

import { useState, useTransition } from 'react'
import { saveCues } from '@/app/athletes/[id]/actions'
import type { CuesData } from './AthleteTabs'

type Section = 'helps' | 'avoid' | 'best_cues' | 'kit'

const SECTION_LABELS: Record<Section, { label: string; placeholder: string; color: string }> = {
  helps: { label: 'Helps', placeholder: 'e.g. Music during warm-up', color: 'bg-green-100 text-green-800' },
  avoid: { label: 'Avoid', placeholder: 'e.g. Crowded start lines', color: 'bg-red-100 text-red-800' },
  best_cues: { label: 'Best Cues', placeholder: 'e.g. Look ahead not down', color: 'bg-blue-100 text-blue-800' },
  kit: { label: 'Kit', placeholder: 'e.g. Cushioned shoes', color: 'bg-purple-100 text-purple-800' },
}

const SECTIONS: Section[] = ['helps', 'avoid', 'best_cues', 'kit']

type CuesTabProps = {
  athleteId: string
  initialCues: CuesData | null
}

function emptyCues(athleteId: string): CuesData {
  return {
    id: '',
    athlete_id: athleteId,
    helps: [],
    avoid: [],
    best_cues: [],
    kit: [],
    version: 0,
    previous_cues: null,
    updated_by: null,
    updated_at: new Date().toISOString(),
  }
}

export default function CuesTab({ athleteId, initialCues }: CuesTabProps) {
  const [cues, setCues] = useState<CuesData>(initialCues ?? emptyCues(athleteId))
  const [inputValues, setInputValues] = useState<Record<Section, string>>({
    helps: '', avoid: '', best_cues: '', kit: '',
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSave(updated: CuesData) {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveCues(athleteId, {
        id: updated.id || undefined,
        helps: updated.helps,
        avoid: updated.avoid,
        best_cues: updated.best_cues,
        kit: updated.kit,
        version: updated.version,
      })
      if (result.error) {
        setSaveError(result.error)
      } else if (result.data) {
        setCues(result.data as CuesData)
      }
    })
  }

  function addTag(section: Section) {
    const value = inputValues[section].trim()
    if (!value) return
    const updated = { ...cues, [section]: [...cues[section], value] }
    setCues(updated)
    setInputValues((prev) => ({ ...prev, [section]: '' }))
    handleSave(updated)
  }

  function removeTag(section: Section, index: number) {
    const updated = { ...cues, [section]: cues[section].filter((_, i) => i !== index) }
    setCues(updated)
    handleSave(updated)
  }

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Could not save: {saveError}
        </div>
      )}
      {isPending && (
        <p className="text-xs text-gray-400 text-right">Saving…</p>
      )}

      {SECTIONS.map((section) => {
        const { label, placeholder, color } = SECTION_LABELS[section]
        return (
          <div key={section}>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {label}
            </h2>

            {/* Tag list */}
            <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
              {cues[section].length === 0 && (
                <p className="text-xs text-gray-400 italic">None added yet</p>
              )}
              {cues[section].map((tag, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${color}`}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(section, i)}
                    className="ml-1.5 hover:opacity-70 leading-none font-bold"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add input with explicit button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValues[section]}
                onChange={(e) => setInputValues((prev) => ({ ...prev, [section]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(section) } }}
                placeholder={placeholder}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={() => addTag(section)}
                disabled={!inputValues[section].trim() || isPending}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
