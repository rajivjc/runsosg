'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/utils/dates'
import { updateCoachNote, deleteCoachNote } from '@/app/athletes/[id]/actions'
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
  const [error, setError] = useState<string | null>(null)

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
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setSaving(true)
    const result = await deleteCoachNote(note.id, athleteId)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onChanged?.()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-blue-400">
      {editing ? (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setEditing(false); setEditText(note.content) }}
              className="text-sm text-gray-500 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editText.trim()}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {(note.coach_name || note.coach_email) && (
                <span className="text-xs font-medium text-gray-500">
                  {note.coach_name ?? note.coach_email!.split('@')[0]}
                </span>
              )}
              <span className="text-xs text-gray-400">{formatDateTime(note.created_at)}</span>
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-gray-400 hover:text-teal-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
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
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">New note</p>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => onNoteTextChange?.(e.target.value)}
                placeholder="Write a coach note about this athlete…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button onClick={onCancelNote} className="text-sm text-gray-500 px-3 py-1.5">
                  Cancel
                </button>
                <button
                  onClick={onSaveNote}
                  disabled={savingNote || !noteText.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
                >
                  {savingNote ? 'Saving…' : 'Save note'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onToggleNoteInput}
              className="w-full border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-gray-400 hover:text-teal-600 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              + Add note
            </button>
          )}
        </div>
      )}

      {notes.length === 0 && !showNoteInput ? (
        <p className="text-center text-gray-500 py-8 text-sm">
          No coach notes yet.{!isReadOnly && ' Tap "Add note" above to write one.'}
        </p>
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
