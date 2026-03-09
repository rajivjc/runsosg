'use client'

import Link from 'next/link'

interface EarnedMilestone {
  id: string
  label: string
  icon: string
  achieved_at: string
}

interface MilestoneDefinition {
  id: string
  label: string
  icon: string
  condition: { metric?: string; threshold?: number } | null
}

interface Props {
  earned: EarnedMilestone[]
  definitions: MilestoneDefinition[]
  currentSessionCount: number
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
}

export default function MilestoneTimeline({ earned, definitions, currentSessionCount }: Props) {
  // Build a map of earned milestones by definition id
  const earnedMap = new Map<string, EarnedMilestone>()
  for (const m of earned) {
    // Match earned milestones to definitions by label (since earned milestones store the label)
    const def = definitions.find(d => d.label === m.label)
    if (def) earnedMap.set(def.id, m)
  }

  // Sort definitions by threshold (session_count milestones first, then by threshold value)
  const sortedDefs = [...definitions]
    .filter(d => d.condition?.metric === 'session_count' && d.condition?.threshold)
    .sort((a, b) => (a.condition?.threshold ?? 0) - (b.condition?.threshold ?? 0))

  // Also include non-session-count milestones that were earned (e.g., distance milestones)
  const otherEarned = earned.filter(m => {
    const def = definitions.find(d => d.label === m.label)
    return def && def.condition?.metric !== 'session_count'
  })

  if (sortedDefs.length === 0 && otherEarned.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
        Milestone Journey
      </p>

      <div className="relative">
        {sortedDefs.map((def, i) => {
          const isEarned = earnedMap.has(def.id)
          const earnedData = earnedMap.get(def.id)
          const isLast = i === sortedDefs.length - 1
          const threshold = def.condition?.threshold ?? 0
          const progress = Math.min(currentSessionCount, threshold)

          return (
            <div key={def.id} className="flex gap-3 relative">
              {/* Timeline line */}
              {!isLast && (
                <div
                  className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] ${
                    isEarned ? 'bg-amber-300' : 'bg-gray-200 border-dashed'
                  }`}
                  style={!isEarned ? { backgroundImage: 'repeating-linear-gradient(to bottom, #e5e7eb 0, #e5e7eb 4px, transparent 4px, transparent 8px)' , backgroundColor: 'transparent' } : undefined}
                />
              )}

              {/* Node */}
              <div
                className={`relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 ${
                  isEarned
                    ? 'bg-amber-100 ring-2 ring-amber-300'
                    : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <span className={`text-sm ${isEarned ? '' : 'grayscale opacity-30'}`}>
                  {def.icon}
                </span>
                {!isEarned && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px]">🔒</span>
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 pb-4 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${isEarned ? 'text-gray-900' : 'text-gray-400'}`}>
                    {def.label}
                  </p>
                  {isEarned && earnedData && (
                    <Link href={`/milestone/${earnedData.id}`} className="text-[10px] text-amber-500 flex-shrink-0 ml-2">
                      Share ↗
                    </Link>
                  )}
                </div>

                {isEarned && earnedData ? (
                  <p className="text-[10px] text-amber-500 mt-0.5">
                    {formatDate(earnedData.achieved_at)}
                  </p>
                ) : (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gray-300 h-1.5 rounded-full transition-all"
                          style={{ width: `${threshold > 0 ? (progress / threshold) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {progress}/{threshold} runs
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Other earned milestones (distance, etc.) at the bottom */}
        {otherEarned.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            {otherEarned.map(m => (
              <Link key={m.id} href={`/milestone/${m.id}`}>
                <div className="flex items-center gap-3 bg-amber-50/50 hover:bg-amber-50 rounded-lg px-3 py-2.5 transition-colors">
                  <span className="text-xl flex-shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                    <p className="text-[10px] text-amber-500">{formatDate(m.achieved_at)}</p>
                  </div>
                  <span className="text-xs text-amber-400">Share ↗</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
