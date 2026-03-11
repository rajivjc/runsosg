'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
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
  athleteName: string
  initialCues: CuesData | null
}

type UndoState = {
  section: Section
  tag: string
  index: number
  prevCues: CuesData
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

const UNDO_TIMEOUT_MS = 5000

export default function CuesTab({ athleteId, athleteName, initialCues }: CuesTabProps) {
  const [cues, setCues] = useState<CuesData>(initialCues ?? emptyCues(athleteId))
  const [inputValues, setInputValues] = useState<Record<Section, string>>({
    helps: '', avoid: '', best_cues: '', kit: '',
  })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undo, setUndo] = useState<UndoState | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearUndoTimer()
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [clearUndoTimer])

  async function handleSave(updated: CuesData) {
    setSaveError(null)
    setShowSaved(false)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
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
        setShowSaved(true)
        savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
      }
    })
  }

  function addTag(section: Section) {
    const value = inputValues[section].trim()
    if (!value) return
    // Clear any pending undo — a new action supersedes it
    clearUndoTimer()
    setUndo(null)
    const updated = { ...cues, [section]: [...cues[section], value] }
    setCues(updated)
    setInputValues((prev) => ({ ...prev, [section]: '' }))
    handleSave(updated)
  }

  function removeTag(section: Section, index: number) {
    const removedTag = cues[section][index]
    const prevCues = cues
    const updated = { ...cues, [section]: cues[section].filter((_, i) => i !== index) }
    setCues(updated)
    handleSave(updated)

    // Set up undo
    clearUndoTimer()
    setUndo({ section, tag: removedTag, index, prevCues })
    undoTimerRef.current = setTimeout(() => {
      setUndo(null)
    }, UNDO_TIMEOUT_MS)
  }

  function handleUndo() {
    if (!undo) return
    clearUndoTimer()
    // Re-insert the tag at its original position
    const currentList = [...cues[undo.section]]
    currentList.splice(undo.index, 0, undo.tag)
    const restored = { ...cues, [undo.section]: currentList }
    setCues(restored)
    setUndo(null)
    handleSave(restored)
  }

  const allEmpty = SECTIONS.every((s) => cues[s].length === 0)

  return (
    <div className="space-y-6">
      {allEmpty && (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-base font-semibold text-gray-900 mb-1">No coaching cues yet</p>
          <p className="text-sm text-gray-500">
            Cues help coaches know what works for {athleteName.split(' ')[0]}. Add the first one below.
          </p>
        </div>
      )}
      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
      {/* Save status toast — prominent and fixed so it's not missed */}
      {(isPending || showSaved) && !undo && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 animate-[fadeIn_0.2s_ease-out] ${isPending ? 'bg-gray-900' : 'bg-teal-600'}`}>
          {isPending ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving cues…</span>
            </>
          ) : (
            <>
              <span>&#x2713;</span>
              <span>Saved</span>
            </>
          )}
        </div>
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
                    className="ml-1.5 hover:opacity-70 active:scale-90 leading-none font-bold transition-transform"
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
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)]"
              />
              <button
                onClick={() => addTag(section)}
                disabled={!inputValues[section].trim() || isPending}
                className="bg-teal-600 hover:bg-teal-700 active:scale-[0.97] disabled:opacity-40 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-all duration-150"
              >
                Add
              </button>
            </div>
          </div>
        )
      })}

      {/* Undo toast */}
      {undo && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
          <span>Removed &ldquo;{undo.tag}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="font-semibold text-teal-300 hover:text-teal-200 transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
