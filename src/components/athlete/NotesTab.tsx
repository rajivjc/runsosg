'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/dates'
import { updateCoachNote, deleteCoachNote, toggleNoteStoryInclusion } from '@/app/athletes/[id]/actions'
import type { NoteData } from './AthleteTabs'

type NotesTabProps = {
  notes: NoteData[]
  isReadOnly?: boolean
  currentUserId?: string
  athleteId?: string
  showNoteInput?: boolean
  noteText?: string
  savingNote?: boolean
  onToggleNoteInput?: () => void
  onNoteTextChange?: (text: string) => void
  onSaveNote?: () => void
  onCancelNote?: () => void
  onNotesChanged?: () => void
}

type NoteCardProps = {
  note: NoteData
  isOwner: boolean
  athleteId: string
  onChanged?: () => void
}

function NoteCard({ note, isOwner, athleteId, onChanged }: NoteCardProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storyIncluded, setStoryIncluded] = useState(note.include_in_story)
  const [togglingStory, setTogglingStory] = useState(false)

  async function handleSaveEdit() {
    if (!editText.trim()) return
    setSaving(true)
    setError(null)
    const result = await updateCoachNote(note.id, editText.trim())
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditing(false)
    onChanged?.()
  }

  async function handleDelete() {
    setSaving(true)
    const result = await deleteCoachNote(note.id, athleteId)
    setSaving(false)
    if (result.error) { setError(result.error); setConfirmingDelete(false); return }
    setDeleted(true)
    onChanged?.()
  }

  async function handleToggleStory() {
    setTogglingStory(true)
    const newValue = !storyIncluded
    const result = await toggleNoteStoryInclusion(note.id, newValue)
    setTogglingStory(false)
    if (result.error) { setError(result.error); return }
    setStoryIncluded(newValue)
    onChanged?.()
  }

  if (deleted) return null

  const canToggleStory = isOwner && note.visibility === 'all'

  return (
    <div className="bg-surface rounded-xl border border-border-subtle p-4 shadow-sm border-l-[5px] border-l-blue-400">
      {editing ? (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm resize-none transition-shadow duration-200 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] focus:outline-none"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setEditing(false); setEditText(note.content) }}
              className="text-sm text-text-muted px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editText.trim()}
              className="bg-teal-600 hover:bg-teal-700 active:scale-[0.97] disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-all duration-150"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : confirmingDelete ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-600 dark:text-red-300 font-medium">Delete this note?</span>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} disabled={saving}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] disabled:opacity-60 rounded-lg px-3 py-1.5 transition-all duration-150">
              {saving ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmingDelete(false)} disabled={saving}
              className="text-xs text-text-muted hover:text-text-secondary px-2 py-1.5 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {(note.coach_name || note.coach_email) && (
                <span className="text-xs font-medium text-text-muted">
                  {note.coach_name ?? note.coach_email!.split('@')[0]}
                </span>
              )}
              <span className="text-xs text-text-hint">{formatDateTime(note.created_at)}</span>
              {storyIncluded && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-600 dark:text-teal-300 font-medium">
                  <BookOpen className="w-3 h-3" /> Story
                </span>
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                {canToggleStory && (
                  <button
                    onClick={handleToggleStory}
                    disabled={togglingStory}
                    title={storyIncluded ? 'Remove from story page' : 'Include in story page'}
                    className={`text-xs transition-colors disabled:opacity-50 ${
                      storyIncluded
                        ? 'text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300'
                        : 'text-text-hint hover:text-teal-600 dark:hover:text-teal-300'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 inline mr-0.5" />
                    {storyIncluded ? 'In story' : 'Add to story'}
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-text-hint hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  disabled={saving}
                  className="text-xs text-text-hint hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-300 mt-2">{error}</p>}
        </>
      )}
    </div>
  )
}

export default function NotesTab({
  notes,
  isReadOnly = false,
  currentUserId,
  athleteId = '',
  showNoteInput = false,
  noteText = '',
  savingNote = false,
  onToggleNoteInput,
  onNoteTextChange,
  onSaveNote,
  onCancelNote,
  onNotesChanged,
}: NotesTabProps) {
  return (
    <div className="space-y-4">
      {!isReadOnly && (
        <div className="mb-2">
          {showNoteInput ? (
            <div className="bg-surface-raised rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">New note</p>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => onNoteTextChange?.(e.target.value)}
                placeholder="Write a coach note about this athlete…"
                rows={3}
                className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm resize-none transition-shadow duration-200 focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(13,148,136,0.08)] focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button onClick={onCancelNote} className="text-sm text-text-muted px-3 py-1.5">
                  Cancel
                </button>
                <button
                  onClick={onSaveNote}
                  disabled={savingNote || !noteText.trim()}
                  className="bg-teal-600 hover:bg-teal-700 active:scale-[0.97] disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-all duration-150"
                >
                  {savingNote ? 'Saving…' : 'Save note'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onToggleNoteInput}
              className="w-full bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 active:scale-[0.98] border border-teal-200 dark:border-teal-400/20 text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-300 rounded-xl py-3.5 text-sm font-semibold transition-all duration-150"
            >
              + Add note
            </button>
          )}
        </div>
      )}

      {notes.length === 0 && !showNoteInput ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm font-medium text-text-primary mb-1">No notes yet</p>
          <p className="text-xs text-text-muted">
            {!isReadOnly ? 'Notes help track what works — add the first one above.' : 'Coach notes will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOwner={!isReadOnly && !!currentUserId && note.coach_user_id === currentUserId}
              athleteId={athleteId}
              onChanged={onNotesChanged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
