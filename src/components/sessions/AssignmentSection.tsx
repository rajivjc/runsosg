'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronUp } from 'lucide-react'

const GroupLogRunSheet = dynamic(() => import('./GroupLogRunSheet'))

type Assignment = {
  coach_id: string
  coach_name: string
  athlete_id: string
  athlete_name: string
}

type LoggedRun = {
  distance_km: number | null
  note: string | null
}

type Props = {
  role: 'admin' | 'coach' | 'caregiver'
  pairingsPublished: boolean
  assignments: Assignment[]
  currentUserId: string
  currentCaregiverAthleteIds: string[]
  athleteCues: Record<string, string>
  trainingSessionId?: string
  sessionDate?: string // YYYY-MM-DD
  loggedRuns?: Record<string, LoggedRun>
  allAthletes?: { id: string; name: string; avatar: string | null }[]
}

export default function AssignmentSection({
  role,
  pairingsPublished,
  assignments,
  currentUserId,
  currentCaregiverAthleteIds,
  athleteCues,
  trainingSessionId,
  sessionDate,
  loggedRuns = {},
  allAthletes,
}: Props) {
  const [allExpanded, setAllExpanded] = useState(false)
  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const router = useRouter()

  if (!pairingsPublished || assignments.length === 0) return null

  // Group assignments by coach
  const coachGroups: Record<string, { coach_name: string; athletes: { athlete_id: string; athlete_name: string }[] }> = {}
  for (const a of assignments) {
    if (!coachGroups[a.coach_id]) {
      coachGroups[a.coach_id] = { coach_name: a.coach_name, athletes: [] }
    }
    coachGroups[a.coach_id].athletes.push({ athlete_id: a.athlete_id, athlete_name: a.athlete_name })
  }

  // Coach view — their own assignments
  const myAssignments = role !== 'caregiver' ? coachGroups[currentUserId] : null

  // Caregiver view — find the coach for their athletes
  const caregiverCoaches = role === 'caregiver'
    ? assignments
        .filter(a => currentCaregiverAthleteIds.includes(a.athlete_id))
        .reduce<Record<string, { coach_name: string; athlete_names: string[]; athlete_ids: string[] }>>((acc, a) => {
          if (!acc[a.coach_id]) acc[a.coach_id] = { coach_name: a.coach_name, athlete_names: [], athlete_ids: [] }
          acc[a.coach_id].athlete_names.push(a.athlete_name)
          acc[a.coach_id].athlete_ids.push(a.athlete_id)
          return acc
        }, {})
    : {}

  const coachGroupList = Object.entries(coachGroups)

  const someLogged = myAssignments?.athletes.some(a => loggedRuns[a.athlete_id]) ?? false

  return (
    <div className="mb-4">
      {/* Coach's own assignments */}
      {myAssignments && (
        <div className="mb-3">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">
            Your Assignments
          </p>
          {myAssignments.athletes.map(a => {
            const logged = loggedRuns[a.athlete_id]
            return (
              <div
                key={a.athlete_id}
                className="flex items-start gap-2.5 bg-accent-bg rounded-lg px-3 py-2.5 mb-1.5"
              >
                <span className="text-base">🏃</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">{a.athlete_name}</p>
                  {logged ? (
                    <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                      <span>✓</span>
                      <span>
                        Run logged
                        {logged.distance_km != null ? ` (${logged.distance_km}km` : ''}
                        {logged.note ? `, "${logged.note}"` : ''}
                        {logged.distance_km != null ? ')' : ''}
                      </span>
                    </p>
                  ) : (
                    athleteCues[a.athlete_id] && (
                      <p className="text-xs text-text-secondary">
                        Cues: &ldquo;{athleteCues[a.athlete_id]}&rdquo;
                      </p>
                    )
                  )}
                </div>
              </div>
            )
          })}
          {trainingSessionId && sessionDate && (
            <button
              onClick={() => setLogSheetOpen(true)}
              className="w-full py-2.5 mt-1 text-sm font-bold rounded-lg bg-accent text-white border-none min-h-[44px] hover:bg-accent-hover active:scale-[0.97] transition-all duration-150"
            >
              {someLogged ? 'Log More' : 'Log Runs'}
            </button>
          )}
        </div>
      )}

      {/* Caregiver view */}
      {role === 'caregiver' && Object.entries(caregiverCoaches).map(([coachId, info]) => (
        <div key={coachId} className="bg-accent-bg rounded-[10px] p-3 mb-3">
          {info.athlete_names.map((name, i) => {
            const athleteId = info.athlete_ids[i]
            const logged = loggedRuns[athleteId]
            return (
              <div key={name}>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">
                  {name}&apos;s Coach
                </p>
                {logged && (
                  <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                    <span>✓</span>
                    <span>
                      Run completed{logged.distance_km != null ? ` — ${logged.distance_km}km` : ''}
                    </span>
                  </p>
                )}
              </div>
            )
          })}
          <p className="text-[15px] font-bold text-text-primary">Coach {info.coach_name}</p>
        </div>
      ))}

      {/* All pairings — collapsed by default */}
      <div>
        <button
          onClick={() => setAllExpanded(!allExpanded)}
          className="flex items-center justify-between w-full py-2.5 text-xs font-bold text-text-muted bg-transparent border-none cursor-pointer border-t border-t-border-subtle uppercase tracking-wide"
        >
          <span>All Pairings ({coachGroupList.length} coaches)</span>
          {allExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {allExpanded && (
          <div className="pb-1">
            {coachGroupList.map(([coachId, group]) => (
              <div
                key={coachId}
                className="flex items-baseline gap-1.5 py-1.5 border-b border-border-subtle last:border-b-0 text-[13px]"
              >
                <span className="font-bold text-text-primary min-w-[60px]">{group.coach_name}</span>
                <span className="text-text-hint">&rarr;</span>
                <span className="text-text-secondary">
                  {group.athletes.map(a => a.athlete_name).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group log sheet */}
      {trainingSessionId && sessionDate && logSheetOpen && (
        <GroupLogRunSheet
          isOpen={logSheetOpen}
          onClose={() => setLogSheetOpen(false)}
          onSaved={() => {
            setLogSheetOpen(false)
            router.refresh()
          }}
          trainingSessionId={trainingSessionId}
          sessionDate={sessionDate}
          assignedAthletes={(myAssignments?.athletes ?? []).map(a => ({
            id: a.athlete_id,
            name: a.athlete_name,
            avatar: null,
          }))}
          allAthletes={allAthletes}
        />
      )}
    </div>
  )
}
