interface Props {
  notes: { content: string; created_at: string }[]
  athleteFirstName: string
}

export default function CaregiverNotesCard({ notes, athleteFirstName }: Props) {
  if (notes.length === 0) return null

  return (
    <div className="bg-white border border-amber-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
      <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2.5">
        What coaches are saying about {athleteFirstName}
      </p>
      <div className="space-y-1.5">
        {notes.map((n, i) => (
          <p key={i} className="text-xs text-amber-800 bg-amber-50/40 rounded-lg px-3 py-2 italic line-clamp-2">
            &ldquo;{n.content}&rdquo;
          </p>
        ))}
      </div>
    </div>
  )
}
