'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils/dates'

interface Props {
  notes: { content: string; created_at: string; coach_name: string | null }[]
  athleteFirstName: string
}

function NoteCard({ note }: { note: Props['notes'][number] }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = note.content.length > 120

  return (
    <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl px-4 py-3.5 border border-amber-100/60">
      <div className="flex gap-3">
        <span className="text-amber-300 text-2xl leading-none font-serif select-none" aria-hidden="true">&ldquo;</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-gray-700 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {note.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-1 transition-colors"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <div className="flex items-center gap-2 mt-2">
            {note.coach_name && (
              <span className="text-xs font-medium text-gray-500">
                — {note.coach_name}
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {formatDate(note.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CaregiverNotesCard({ notes, athleteFirstName }: Props) {
  if (notes.length === 0) return null

  return (
    <div className="bg-white border border-amber-100 rounded-xl px-4 py-4 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">
        What coaches are saying about {athleteFirstName}
      </p>
      <div className="space-y-2.5">
        {notes.map((n, i) => (
          <NoteCard key={i} note={n} />
        ))}
      </div>
    </div>
  )
}
