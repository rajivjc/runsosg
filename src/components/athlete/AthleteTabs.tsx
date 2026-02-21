'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Json } from '@/lib/supabase/types'
import RunsTab from './RunsTab'
import CuesTab from './CuesTab'
import NotesTab from './NotesTab'
import QuickLogSheet from './QuickLogSheet'

export type AthleteData = {
  id: string
  name: string
  photo_url: string | null
  active: boolean
}

export type SessionData = {
  id: string
  date: string
  distance_km: number | null
  duration_seconds: number | null
  feel: 1 | 2 | 3 | 4 | 5 | null
  note: string | null
  sync_source: 'strava_webhook' | 'manual' | 'backfill' | null
  coach_user_id: string | null
}

export type CuesData = {
  id: string
  athlete_id: string
  helps: string[]
  avoid: string[]
  best_cues: string[]
  kit: string[]
  version: number
  previous_cues: Json | null
  updated_by: string | null
  updated_at: string
}

export type NoteData = {
  id: string
  content: string
  created_at: string
  coach_user_id: string | null
}

export type MilestoneData = {
  id: string
  label: string
  achieved_at: string
}

type Tab = 'feed' | 'cues' | 'notes'

type AthleteTabsProps = {
  athlete: AthleteData
  sessions: SessionData[]
  cues: CuesData | null
  notes: NoteData[]
  milestones: MilestoneData[]
  addCoachNote: (athleteId: string, content: string) => Promise<void>
  isReadOnly?: boolean
}

export default function AthleteTabs({
  athlete,
  sessions,
  cues,
  notes,
  milestones,
  addCoachNote,
  isReadOnly = false,
}: AthleteTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Find the most recent completed session for quick log
  const latestSession = sessions[0] ?? null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Runs' },
    ...(!isReadOnly ? [{ key: 'cues' as Tab, label: 'Cues' }] : []),
    { key: 'notes', label: 'Notes' },
  ]

  async function handleSaveNote() {
    const trimmed = noteText.trim()
    if (!trimmed) return
    setSavingNote(true)
    await addCoachNote(athlete.id, trimmed)
    setNoteText('')
    setShowNoteInput(false)
    setSavingNote(false)
    router.refresh()
  }

  return (
    <>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium cursor-pointer ${
              activeTab === tab.key
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'feed' && (
        <RunsTab sessions={sessions} milestones={milestones} />
      )}
      {activeTab === 'cues' && (
        <CuesTab athleteId={athlete.id} initialCues={cues} />
      )}
      {activeTab === 'notes' && <NotesTab notes={notes} />}

      {/* Quick action buttons — coaches only */}
      {!isReadOnly && (
        <div className="mt-6 pb-4">
          <div className="max-w-2xl mx-auto">
            {showNoteInput && (
              <div className="mb-3 flex gap-2">
                <textarea
                  autoFocus
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a coach note…"
                  className="flex-1 border border-gray-300 rounded-lg p-2 text-sm resize-none h-16 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote || !noteText.trim()}
                    className="bg-teal-600 text-white rounded-lg px-3 py-1 text-sm font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteInput(false)
                      setNoteText('')
                    }}
                    className="text-gray-500 text-sm px-3 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setLogSheetOpen(true)}
                className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-medium"
              >
                Log Feel
              </button>
              <button
                onClick={() => setShowNoteInput((v) => !v)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Log Sheet */}
      {!isReadOnly && (
        <QuickLogSheet
          sessionId={latestSession?.id ?? null}
          athleteId={athlete.id}
          isOpen={logSheetOpen}
          onClose={() => setLogSheetOpen(false)}
          onSaved={() => {
            setLogSheetOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
