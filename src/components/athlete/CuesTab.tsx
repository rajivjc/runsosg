'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/dates'
import type { CuesData } from './AthleteTabs'

type Section = 'helps' | 'avoid' | 'best_cues' | 'kit'

const SECTION_LABELS: Record<Section, string> = {
  helps: 'Helps',
  avoid: 'Avoid',
  best_cues: 'Best Cues',
  kit: 'Kit',
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
    helps: '',
    avoid: '',
    best_cues: '',
    kit: '',
  })
  const supabase = useMemo(() => createClient(), [])

  const saveCues = useCallback(
    async (updated: CuesData) => {
      const payload = {
        athlete_id: updated.athlete_id,
        helps: updated.helps,
        avoid: updated.avoid,
        best_cues: updated.best_cues,
        kit: updated.kit,
        version: updated.version + 1,
        previous_cues: updated.previous_cues,
        updated_by: updated.updated_by,
        updated_at: new Date().toISOString(),
        ...(updated.id ? { id: updated.id } : {}),
      }
      const { data } = await supabase.from('cues').upsert(payload).select().single()
      if (data) {
        setCues(data as unknown as CuesData)
      }
    },
    [supabase]
  )

  function removeTag(section: Section, index: number) {
    const updated = {
      ...cues,
      [section]: cues[section].filter((_, i) => i !== index),
    }
    setCues(updated)
    saveCues(updated)
  }

  function handleInputKeyDown(section: Section, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = inputValues[section].trim()
      if (!value) return
      const updated = {
        ...cues,
        [section]: [...cues[section], value],
      }
      setCues(updated)
      setInputValues((prev) => ({ ...prev, [section]: '' }))
      saveCues(updated)
    }
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section}>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            {SECTION_LABELS[section]}
          </h2>

          {/* Tag list */}
          <div className="flex flex-wrap gap-2 mb-2">
            {cues[section].map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(section, i)}
                  className="ml-1 text-gray-400 hover:text-red-500 leading-none"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add input */}
          <input
            type="text"
            value={inputValues[section]}
            onChange={(e) =>
              setInputValues((prev) => ({ ...prev, [section]: e.target.value }))
            }
            onKeyDown={(e) => handleInputKeyDown(section, e)}
            placeholder="Add cue…"
            className="text-sm border-b border-gray-300 focus:outline-none focus:border-teal-500 px-1 py-0.5 placeholder-gray-400 bg-transparent w-full"
          />

          {/* Last updated */}
          {cues.updated_at && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated{cues.updated_by ? ` by ${cues.updated_by}` : ''} on{' '}
              {formatDateTime(cues.updated_at)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
