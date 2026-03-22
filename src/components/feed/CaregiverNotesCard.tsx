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
    <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 rounded-xl px-4 py-3.5 border border-amber-100 dark:border-amber-400/20">
      <div className="flex gap-3">
        <span className="text-amber-300 text-2xl leading-none font-serif select-none" aria-hidden="true">&ldquo;</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm text-text-secondary leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {note.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-300 font-medium mt-1 transition-colors"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <div className="flex items-center gap-2 mt-2">
            {note.coach_name && (
              <span className="text-xs font-medium text-text-muted">
                — {note.coach_name}
              </span>
            )}
            <span className="text-[10px] text-text-hint">
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
    <div className="bg-surface border border-amber-100 dark:border-amber-400/20 rounded-xl px-4 py-4 mb-5 shadow-sm">
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
