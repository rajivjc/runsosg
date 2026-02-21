'use client'

import { formatDateTime } from '@/lib/utils/dates'
import type { NoteData } from './AthleteTabs'

type NotesTabProps = {
  notes: NoteData[]
}

export default function NotesTab({ notes }: NotesTabProps) {
  if (notes.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12 text-sm">
        No coach notes yet. Use the &quot;Add Note&quot; button to add one.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm border-l-4 border-l-blue-400"
        >
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center gap-2 mt-2">
            {(note.coach_name || note.coach_email) && (
              <span className="text-xs font-medium text-gray-500">
                {note.coach_name ?? note.coach_email!.split('@')[0]}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDateTime(note.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
