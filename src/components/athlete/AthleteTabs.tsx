'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Json } from '@/lib/supabase/types'
import RunsTab from './RunsTab'
import CuesTab from './CuesTab'
import NotesTab from './NotesTab'
import LogRunSheet from './LogRunSheet'
import { createManualSession } from '@/app/athletes/[id]/actions'

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
  strava_activity_id: number | null
  coach_name: string | null
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
  coach_email: string | null
  coach_name: string | null
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
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [logRunOpen, setLogRunOpen] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Runs' },
    ...(!isReadOnly ? [{ key: 'cues' as Tab, label: 'Cues' }] : []),
    ...(!isReadOnly ? [{ key: 'notes' as Tab, label: 'Notes' }] : []),
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
        <RunsTab
          sessions={sessions}
          milestones={milestones}
          isReadOnly={isReadOnly}
          onSessionUpdated={() => router.refresh()}
          onLogRun={() => setLogRunOpen(true)}
        />
      )}
      {activeTab === 'cues' && (
        <CuesTab athleteId={athlete.id} initialCues={cues} />
      )}
      {activeTab === 'notes' && (
        <NotesTab
          notes={notes}
          isReadOnly={isReadOnly}
          showNoteInput={showNoteInput}
          noteText={noteText}
          savingNote={savingNote}
          onToggleNoteInput={() => setShowNoteInput((v) => !v)}
          onNoteTextChange={(text) => setNoteText(text)}
          onSaveNote={handleSaveNote}
          onCancelNote={() => { setShowNoteInput(false); setNoteText('') }}
        />
      )}

      {!isReadOnly && (
        <LogRunSheet
          athleteId={athlete.id}
          isOpen={logRunOpen}
          onClose={() => setLogRunOpen(false)}
          onSaved={() => { setLogRunOpen(false); router.refresh() }}
          createSession={createManualSession}
        />
      )}
    </>
  )
}
