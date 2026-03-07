'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Json } from '@/lib/supabase/types'
import type { WeeklyVolume, FeelPoint, DistancePoint, MilestonePin } from '@/lib/analytics/session-trends'
import dynamic from 'next/dynamic'
import RunsTab from './RunsTab'
import { createManualSession, loadMorePhotos } from '@/app/athletes/[id]/actions'

const CuesTab = dynamic(() => import('./CuesTab'))
const NotesTab = dynamic(() => import('./NotesTab'))
const PhotosTab = dynamic(() => import('./PhotosTab'))
const LogRunSheet = dynamic(() => import('./LogRunSheet'))

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
  strava_title: string | null
  avg_heart_rate: number | null
  max_heart_rate: number | null
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
  icon?: string
  session_id?: string | null
}

export type PhotoData = {
  id: string
  session_id: string | null
  signed_url: string
  caption: string | null
  created_at: string
}

type Tab = 'feed' | 'cues' | 'notes' | 'photos'

type AthleteTabsProps = {
  athlete: AthleteData
  sessions: SessionData[]
  cues: CuesData | null
  notes: NoteData[]
  milestones: MilestoneData[]
  photos: PhotoData[]
  photosBySession: Record<string, PhotoData[]>
  photoCursor: string | null
  photoCount: number
  weeklyData: { label: string; km: number; weekStart: string }[]
  weeklyVolume?: WeeklyVolume[]
  feelTrend?: FeelPoint[]
  distanceTimeline?: DistancePoint[]
  milestonePins?: MilestonePin[]
  addCoachNote: (athleteId: string, content: string) => Promise<{ error?: string }>
  isReadOnly?: boolean
  currentUserId?: string
  onDeletePhoto?: (photoId: string) => Promise<void>
}

export default function AthleteTabs({
  athlete,
  sessions,
  cues,
  notes,
  milestones,
  photos,
  photosBySession,
  photoCursor,
  photoCount,
  weeklyData,
  weeklyVolume,
  feelTrend,
  distanceTimeline,
  milestonePins,
  addCoachNote,
  isReadOnly = false,
  currentUserId,
  onDeletePhoto,
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
    ...(photoCount > 0 ? [{ key: 'photos' as Tab, label: `Photos (${photoCount})` }] : []),
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
      <div className="flex border-b border-gray-200 mb-4" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-3 text-sm font-semibold cursor-pointer transition-colors ${
              activeTab === tab.key
                ? 'text-teal-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'feed' && (
        <RunsTab
          sessions={sessions}
          milestones={milestones}
          photosBySession={photosBySession}
          weeklyData={weeklyData}
          weeklyVolume={weeklyVolume}
          feelTrend={feelTrend}
          distanceTimeline={distanceTimeline}
          milestonePins={milestonePins}
          athleteId={athlete.id}
          athleteName={athlete.name}
          isReadOnly={isReadOnly}
          onSessionUpdated={() => router.refresh()}
          onLogRun={() => setLogRunOpen(true)}
          onDeletePhoto={onDeletePhoto}
        />
      )}
      {activeTab === 'cues' && (
        <CuesTab athleteId={athlete.id} athleteName={athlete.name} initialCues={cues} />
      )}
      {activeTab === 'photos' && (
        <PhotosTab
          photos={photos}
          athleteName={athlete.name}
          athleteId={athlete.id}
          initialCursor={photoCursor}
          totalCount={photoCount}
          loadMore={loadMorePhotos}
          onDeletePhoto={onDeletePhoto}
        />
      )}
      {activeTab === 'notes' && (
        <NotesTab
          notes={notes}
          isReadOnly={isReadOnly}
          currentUserId={currentUserId}
          athleteId={athlete.id}
          showNoteInput={showNoteInput}
          noteText={noteText}
          savingNote={savingNote}
          onToggleNoteInput={() => setShowNoteInput((v) => !v)}
          onNoteTextChange={(text) => setNoteText(text)}
          onSaveNote={handleSaveNote}
          onCancelNote={() => { setShowNoteInput(false); setNoteText('') }}
          onNotesChanged={() => router.refresh()}
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
