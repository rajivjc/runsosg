'use client'

import { AlertTriangle, Bell, CheckCircle, Send } from 'lucide-react'

export type PublishDialogVariant = 'clean' | 'unassigned' | 'republish'

interface PublishPairingsDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  variant: PublishDialogVariant
  assignedCoachCount: number
  assignedAthleteCount: number
  emptyCoachCount: number
  unassignedAthleteNames: string[]
  /** For republish: list of changes to show */
  changeDescriptions: string[]
  isSubmitting: boolean
}

export default function PublishPairingsDialog({
  open,
  onClose,
  onConfirm,
  variant,
  assignedCoachCount,
  assignedAthleteCount,
  emptyCoachCount,
  unassignedAthleteNames,
  changeDescriptions,
  isSubmitting,
}: PublishPairingsDialogProps) {
  if (!open) return null

  const isRepublish = variant === 'republish'
  const hasUnassigned = variant === 'unassigned'

  return (
    <>
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[calc(100%-48px)] max-w-[342px] rounded-2xl bg-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
        >
          {/* Icon */}
          <div
            className={`mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl ${
              isRepublish
                ? 'bg-blue-50'
                : hasUnassigned
                  ? 'bg-amber-50'
                  : 'bg-accent-bg'
            }`}
          >
            {isRepublish ? (
              <Bell size={22} className="text-blue-600" />
            ) : hasUnassigned ? (
              <AlertTriangle size={22} className="text-amber-600" />
            ) : (
              <Send size={22} className="text-accent" />
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2 text-center text-base font-extrabold text-text-primary">
            {isRepublish
              ? 'Re-publish Pairings?'
              : hasUnassigned
                ? 'Publish with Unassigned Athletes?'
                : 'Publish Pairings?'}
          </h3>

          {/* Body */}
          <div className="mb-4.5 text-center text-[13px] leading-relaxed text-text-secondary">
            {isRepublish ? (
              <>
                This will send updated notifications{' '}
                <strong>
                  only to coaches and caregivers whose assignments changed
                </strong>
                .
                {changeDescriptions.length > 0 && (
                  <div className="mt-2 rounded-md bg-blue-50 p-2.5 text-left text-xs">
                    <div className="mb-1 font-bold text-blue-800">
                      Will be notified:
                    </div>
                    {changeDescriptions.map((desc, i) => (
                      <div key={i} className="text-blue-800">
                        {desc}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : hasUnassigned ? (
              <>
                <strong className="text-amber-600">
                  {unassignedAthleteNames.length} athlete
                  {unassignedAthleteNames.length !== 1 ? 's' : ''}
                </strong>{' '}
                still unassigned. They will not receive a coach assignment
                notification.
                <div className="mt-2 rounded-md bg-amber-50 p-2.5 text-left text-xs">
                  <div className="mb-1 font-bold text-amber-900">
                    Unassigned:
                  </div>
                  <div className="text-amber-800">
                    {unassignedAthleteNames.join(', ')}
                  </div>
                </div>
                <span className="mt-2 inline-block">
                  You can assign them later and re-publish.
                </span>
              </>
            ) : (
              <>
                This will notify <strong>all assigned coaches</strong> of their
                athlete assignments, and <strong>all caregivers</strong> of
                their athlete&apos;s assigned coach.
                <div className="mt-2 rounded-md bg-accent-bg p-2.5 text-left text-xs">
                  <div className="mb-1 font-bold text-teal-700">Summary:</div>
                  <div className="text-teal-800">
                    {assignedCoachCount} coaches with assignments
                  </div>
                  <div className="text-teal-800">
                    {assignedAthleteCount} athletes assigned
                  </div>
                  <div className="text-teal-800">
                    {emptyCoachCount} coaches with no athletes (not notified)
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border-none bg-[#0F766E] py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {isSubmitting
                ? 'Publishing...'
                : isRepublish
                  ? 'Re-publish'
                  : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
