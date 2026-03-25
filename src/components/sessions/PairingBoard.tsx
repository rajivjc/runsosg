'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Edit,
  Send,
  Trash2,
} from 'lucide-react'
import PairingSummaryBar from './PairingSummaryBar'
import CoachFilterBar, { type FilterType } from './CoachFilterBar'
import CoachPairingRow from './CoachPairingRow'
import UnassignedAthletesList from './UnassignedAthletesList'
import AthletePickerSheet from './AthletePickerSheet'
import CoachPickerSheet from './CoachPickerSheet'
import PublishPairingsDialog, {
  type PublishDialogVariant,
} from './PublishPairingsDialog'
import {
  savePairings,
  publishPairings,
  republishPairings,
} from '@/lib/sessions/pairing-actions'
import type { PairingChange } from '@/lib/sessions/notifications'

// ── Types ────────────────────────────────────────────────────────────────

interface AssignedAthlete {
  id: string
  name: string
  tag: 'regular' | 'suggested' | null
}

interface CoachState {
  id: string
  name: string
  athletes: AssignedAthlete[]
}

interface UnassignedAthlete {
  id: string
  name: string
}

export interface PairingBoardProps {
  sessionId: string
  formattedDate: string
  location: string
  maxAthletesPerCoach: number
  initialCoaches: CoachState[]
  initialUnassigned: UnassignedAthlete[]
  pairingsPublishedAt: string | null
  pairingsStale: boolean
  staleMessage: string | null
  hasSuggestions: boolean
}

type BoardMode = 'editing' | 'published'

// ── Component ────────────────────────────────────────────────────────────

export default function PairingBoard({
  sessionId,
  formattedDate,
  location,
  maxAthletesPerCoach,
  initialCoaches,
  initialUnassigned,
  pairingsPublishedAt,
  pairingsStale,
  staleMessage,
  hasSuggestions,
}: PairingBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── State ──────────────────────────────────────────────────────────

  const [coaches, setCoaches] = useState<CoachState[]>(initialCoaches)
  const [unassigned, setUnassigned] = useState<UnassignedAthlete[]>(initialUnassigned)
  const [mode, setMode] = useState<BoardMode>(
    pairingsPublishedAt && !pairingsStale ? 'published' : 'editing'
  )

  // Original assignments snapshot for diffing on republish
  const [originalAssignments] = useState(() => {
    const map = new Map<string, string>() // athleteId -> coachId
    for (const coach of initialCoaches) {
      for (const athlete of coach.athletes) {
        map.set(athlete.id, coach.id)
      }
    }
    return map
  })

  // Filter state
  const [filter, setFilter] = useState<FilterType>('all')
  const [coachSearch, setCoachSearch] = useState('')
  const [showStale, setShowStale] = useState(pairingsStale)

  // Bottom sheet state
  const [athletePickerCoachId, setAthletePickerCoachId] = useState<string | null>(null)
  const [coachPickerAthlete, setCoachPickerAthlete] = useState<UnassignedAthlete | null>(null)

  // Publish dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogVariant, setDialogVariant] = useState<PublishDialogVariant>('clean')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // ── Derived values ─────────────────────────────────────────────────

  const totalAthletes = coaches.reduce((n, c) => n + c.athletes.length, 0) + unassigned.length
  const unassignedCount = unassigned.length

  const filteredCoaches = useMemo(() => {
    let list = coaches
    if (coachSearch) {
      const q = coachSearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.athletes.some((a) => a.name.toLowerCase().includes(q))
      )
    }
    if (filter === 'has') list = list.filter((c) => c.athletes.length > 0)
    if (filter === 'empty') list = list.filter((c) => c.athletes.length === 0)
    if (filter === 'lt3') list = list.filter((c) => c.athletes.length < maxAthletesPerCoach)
    return list
  }, [coaches, coachSearch, filter, maxAthletesPerCoach])

  const assignedCoachCount = coaches.filter((c) => c.athletes.length > 0).length
  const assignedAthleteCount = coaches.reduce((n, c) => n + c.athletes.length, 0)
  const emptyCoachCount = coaches.filter((c) => c.athletes.length === 0).length

  const athletePickerCoach = coaches.find((c) => c.id === athletePickerCoachId)

  const coachOptionsForPicker = useMemo(
    () =>
      coaches.map((c) => ({
        id: c.id,
        name: c.name,
        currentCount: c.athletes.length,
      })),
    [coaches]
  )

  // ── Actions (client-state only) ────────────────────────────────────

  const assignAthleteToCoach = useCallback(
    (coachId: string, athlete: { id: string; name: string }) => {
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coachId
            ? { ...c, athletes: [...c.athletes, { ...athlete, tag: null }] }
            : c
        )
      )
      setUnassigned((prev) => prev.filter((a) => a.id !== athlete.id))
      setAthletePickerCoachId(null)
      setCoachPickerAthlete(null)
    },
    []
  )

  const removeAthleteFromCoach = useCallback(
    (coachId: string, athleteId: string) => {
      let removedName = ''
      setCoaches((prev) =>
        prev.map((c) => {
          if (c.id !== coachId) return c
          const removed = c.athletes.find((a) => a.id === athleteId)
          if (removed) removedName = removed.name
          return { ...c, athletes: c.athletes.filter((a) => a.id !== athleteId) }
        })
      )
      if (removedName) {
        setUnassigned((prev) => [...prev, { id: athleteId, name: removedName }])
      }
    },
    []
  )

  const clearAll = useCallback(() => {
    const allAthletes: UnassignedAthlete[] = []
    setCoaches((prev) =>
      prev.map((c) => {
        for (const a of c.athletes) {
          allAthletes.push({ id: a.id, name: a.name })
        }
        return { ...c, athletes: [] }
      })
    )
    setUnassigned((prev) => [...prev, ...allAthletes])
  }, [])

  // ── Compute changes for republish ──────────────────────────────────

  function computeChanges(): PairingChange[] {
    const changes: PairingChange[] = []
    const currentMap = new Map<string, string>() // athleteId -> coachId
    for (const coach of coaches) {
      for (const athlete of coach.athletes) {
        currentMap.set(athlete.id, coach.id)
      }
    }

    // Athletes that changed coaches or were newly assigned
    for (const [athleteId, newCoachId] of currentMap) {
      const oldCoachId = originalAssignments.get(athleteId)
      if (!oldCoachId) {
        // Newly assigned
        changes.push({ coachId: newCoachId, athleteId, type: 'athlete_added' })
      } else if (oldCoachId !== newCoachId) {
        // Reassigned
        changes.push({ coachId: oldCoachId, athleteId, type: 'athlete_removed' })
        changes.push({ coachId: newCoachId, athleteId, type: 'athlete_added' })
      }
    }

    // Athletes that were removed
    for (const [athleteId, oldCoachId] of originalAssignments) {
      if (!currentMap.has(athleteId)) {
        changes.push({ coachId: oldCoachId, athleteId, type: 'athlete_removed' })
      }
    }

    return changes
  }

  // ── Publish flow ───────────────────────────────────────────────────

  const handlePublishClick = () => {
    const isRepublish = !!pairingsPublishedAt
    if (isRepublish) {
      setDialogVariant('republish')
    } else if (unassignedCount > 0) {
      setDialogVariant('unassigned')
    } else {
      setDialogVariant('clean')
    }
    setDialogOpen(true)
  }

  const handleConfirmPublish = async () => {
    setIsSubmitting(true)

    // Build assignment list from current state
    const assignmentList: { coachId: string; athleteId: string }[] = []
    for (const coach of coaches) {
      for (const athlete of coach.athletes) {
        assignmentList.push({ coachId: coach.id, athleteId: athlete.id })
      }
    }

    // Save pairings first
    const saveResult = await savePairings(sessionId, assignmentList)
    if (saveResult.error) {
      setIsSubmitting(false)
      setDialogOpen(false)
      setToast(saveResult.error)
      setTimeout(() => setToast(null), 4000)
      return
    }

    // Publish or republish
    const isRepublish = !!pairingsPublishedAt
    if (isRepublish) {
      const changes = computeChanges()
      const result = await republishPairings(sessionId, changes)
      if (result.error) {
        setIsSubmitting(false)
        setDialogOpen(false)
        setToast(result.error)
        setTimeout(() => setToast(null), 4000)
        return
      }
    } else {
      const result = await publishPairings(sessionId)
      if (result.error) {
        setIsSubmitting(false)
        setDialogOpen(false)
        setToast(result.error)
        setTimeout(() => setToast(null), 4000)
        return
      }
    }

    setIsSubmitting(false)
    setDialogOpen(false)
    setMode('published')
    setToast('Pairings published — notifications sent')
    setTimeout(() => setToast(null), 3000)
    startTransition(() => router.refresh())
  }

  // ── Render: Published read-only state ──────────────────────────────

  if (mode === 'published') {
    const assignedCoaches = coaches.filter((c) => c.athletes.length > 0)
    const emptyCoaches = coaches.filter((c) => c.athletes.length === 0)

    return (
      <div className="min-h-screen bg-bg">
        {/* Toast */}
        {toast && (
          <div className="fixed left-1/2 top-4 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-[10px] bg-emerald-800 px-4.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <CheckCircle size={16} /> {toast}
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-50 border-b border-border bg-surface px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-extrabold text-text-primary">
                Pairings
              </div>
              <div className="text-xs text-text-muted">
                {formattedDate} · {location}
              </div>
            </div>
            <button
              onClick={() => setMode('editing')}
              className="flex items-center gap-1 rounded-lg border border-teal-200 bg-accent-bg px-3 py-1.5 text-[13px] font-bold text-accent"
            >
              <Edit size={14} /> Edit Pairings
            </button>
          </div>

          {/* Published banner */}
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs">
            <CheckCircle size={14} className="text-teal-700" />
            <div>
              <span className="font-bold text-emerald-800">Published</span>
              <span className="ml-1.5 text-emerald-600">
                {assignedCoaches.length} coaches · {assignedAthleteCount} athletes
              </span>
            </div>
          </div>
        </div>

        {/* Read-only pairing cards */}
        <div className="px-3.5 py-2.5">
          {assignedCoaches.map((coach) => (
            <div
              key={coach.id}
              className="mb-2 rounded-[10px] border border-border-subtle border-l-4 border-l-accent bg-surface p-2.5 px-3"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-sm font-bold text-text-primary">
                  {coach.name}
                </span>
                <span className="rounded bg-accent-bg px-1.5 py-px text-[10px] font-bold text-teal-700">
                  {coach.athletes.length} athlete
                  {coach.athletes.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coach.athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center gap-1 rounded-md bg-surface-alt px-2.5 py-1.5 text-[13px] font-medium text-text-primary"
                  >
                    <span aria-hidden="true">🏃</span> {athlete.name}
                    {athlete.tag && (
                      <span
                        className={`rounded px-1.5 py-px text-[10px] font-semibold ${
                          athlete.tag === 'regular'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {athlete.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {emptyCoaches.length > 0 && (
            <div className="mt-1 rounded-[10px] bg-surface-alt px-3.5 py-2.5">
              <div className="mb-1 text-xs font-semibold text-text-hint">
                Coaches without assignments ({emptyCoaches.length})
              </div>
              <div className="text-xs text-text-hint">
                {emptyCoaches.map((c) => c.name).join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="px-3.5 pt-4 pb-8">
          <button
            onClick={() => router.push(`/sessions/${sessionId}`)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-3 text-sm font-semibold text-text-secondary"
          >
            <ArrowLeft size={16} /> Back to Session Details
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Editing state ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg">
      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-[10px] bg-emerald-800 px-4.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-50 border-b border-border bg-surface px-3.5 py-3">
        {/* Title */}
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold text-text-primary">
              Assign Pairings
            </div>
            <div className="text-xs text-text-muted">
              {formattedDate} · {location}
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <PairingSummaryBar
          coachCount={coaches.length}
          totalAthletes={totalAthletes}
          unassignedCount={unassignedCount}
        />

        {/* Stale banner */}
        {showStale && staleMessage && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            <AlertTriangle size={13} className="text-amber-600" />
            <span>{staleMessage}</span>
            <button
              onClick={() => setShowStale(false)}
              className="ml-auto border-none bg-transparent text-[11px] font-semibold text-amber-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Suggestion banner */}
        {hasSuggestions && !pairingsPublishedAt && (
          <div className="mt-2 rounded-md bg-accent-bg px-2.5 py-1.5 text-[11px] text-teal-800">
            Suggestions applied — review and adjust
          </div>
        )}

        {/* No history banner */}
        {!hasSuggestions && !pairingsPublishedAt && assignedAthleteCount === 0 && (
          <div className="mt-2 rounded-md bg-surface-alt px-2.5 py-1.5 text-[11px] text-text-muted">
            No coaching history yet — assign manually
          </div>
        )}

        {/* Filter bar */}
        <CoachFilterBar
          search={coachSearch}
          onSearchChange={setCoachSearch}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* ── Coach List ── */}
      <div className="px-3.5 py-2.5">
        {filteredCoaches.map((coach) => (
          <CoachPairingRow
            key={coach.id}
            coachId={coach.id}
            coachName={coach.name}
            athletes={coach.athletes}
            maxAthletes={maxAthletesPerCoach}
            onAddClick={(id) => setAthletePickerCoachId(id)}
            onRemoveClick={removeAthleteFromCoach}
          />
        ))}
      </div>

      {/* ── Unassigned Athletes ── */}
      <UnassignedAthletesList
        athletes={unassigned}
        onAssignClick={(athlete) => setCoachPickerAthlete(athlete)}
      />

      {/* ── Action Buttons ── */}
      <div className="px-3.5 pb-8">
        {/* Clear all - only when there are assignments */}
        {assignedAthleteCount > 0 && (
          <button
            onClick={clearAll}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-text-secondary"
          >
            <Trash2 size={14} /> Clear All
          </button>
        )}

        {/* Publish button */}
        <button
          onClick={handlePublishClick}
          disabled={assignedAthleteCount === 0}
          className="flex w-full min-h-[48px] items-center justify-center gap-1.5 rounded-[10px] border-none bg-[#0F766E] py-3.5 text-[15px] font-extrabold text-white shadow-[0_2px_8px_rgba(15,118,110,0.3)] disabled:opacity-40"
        >
          <Send size={16} /> Publish Pairings
        </button>

        {unassignedCount > 0 && assignedAthleteCount > 0 && (
          <div className="mt-1.5 text-center text-[11px] text-amber-600">
            {unassignedCount} athlete{unassignedCount !== 1 ? 's' : ''} still
            unassigned — you can still publish
          </div>
        )}
      </div>

      {/* ── Athlete Picker Bottom Sheet ── */}
      <AthletePickerSheet
        open={athletePickerCoachId !== null}
        onClose={() => setAthletePickerCoachId(null)}
        coachName={athletePickerCoach?.name ?? ''}
        unassignedAthletes={unassigned}
        onSelect={(athlete) =>
          athletePickerCoachId &&
          assignAthleteToCoach(athletePickerCoachId, athlete)
        }
      />

      {/* ── Coach Picker Bottom Sheet ── */}
      <CoachPickerSheet
        open={coachPickerAthlete !== null}
        onClose={() => setCoachPickerAthlete(null)}
        athleteName={coachPickerAthlete?.name ?? ''}
        coaches={coachOptionsForPicker}
        maxAthletes={maxAthletesPerCoach}
        onSelect={(coachId) =>
          coachPickerAthlete &&
          assignAthleteToCoach(coachId, coachPickerAthlete)
        }
      />

      {/* ── Publish Dialog ── */}
      <PublishPairingsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmPublish}
        variant={dialogVariant}
        assignedCoachCount={assignedCoachCount}
        assignedAthleteCount={assignedAthleteCount}
        emptyCoachCount={emptyCoachCount}
        unassignedAthleteNames={unassigned.map((a) => a.name)}
        changeDescriptions={
          dialogVariant === 'republish'
            ? computeChanges().map((c) => {
                if (c.type === 'athlete_added')
                  return `• Coach gained an athlete`
                if (c.type === 'athlete_removed')
                  return `• Coach lost an athlete`
                return `• Assignment changed`
              })
            : []
        }
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
