'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { Calendar, Clock, MapPin, ChevronLeft } from 'lucide-react'
import { createSession, updateSession, publishSession } from '@/app/admin/sessions/actions'
import type { SessionActionState } from '@/app/admin/sessions/actions'

type SessionData = {
  id: string
  date: string
  startTime: string
  endTime: string
  location: string
  title: string
  notes: string
  coachDeadline: string
  athleteDeadline: string
  status: string
}

type Props = {
  mode: 'create' | 'edit'
  defaults: {
    date: string
    startTime: string
    endTime: string
    location: string
    title: string
    notes: string
    coachDeadline: string
    athleteDeadline: string
  }
  session?: SessionData
  timezone: string
}

const initialState: SessionActionState = {}

function createBoundUpdate(sessionId: string) {
  return async (_prev: SessionActionState, formData: FormData): Promise<SessionActionState> => {
    return updateSession(sessionId, _prev, formData)
  }
}

export default function SessionForm({ mode, defaults, session, timezone }: Props) {
  void timezone
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const action = mode === 'edit' && session
    ? createBoundUpdate(session.id)
    : createSession

  const [state, formAction] = useFormState(action, initialState)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // After successful create, redirect or publish
  useEffect(() => {
    if (state.success && state.sessionId) {
      if (publishing) {
        // Now publish the created/updated session
        publishSession(state.sessionId).then((result) => {
          setPublishing(false)
          if (result.error) {
            setPublishError(result.error)
          } else {
            router.push('/admin/sessions')
          }
        })
      } else {
        router.push('/admin/sessions')
      }
    }
  }, [state.success, state.sessionId, publishing, router])

  function handlePublish() {
    if (mode === 'edit' && session?.status === 'draft') {
      // For existing drafts, save then publish
      setPublishing(true)
      formRef.current?.requestSubmit()
    } else if (mode === 'create') {
      setPublishing(true)
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="px-3.5 pt-3 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => router.push('/admin/sessions')}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-alt border-none cursor-pointer"
        >
          <ChevronLeft size={18} className="text-text-muted" />
        </button>
        <h1 className="text-lg font-extrabold text-text-primary m-0">
          {mode === 'edit' ? 'Edit Training Session' : 'New Training Session'}
        </h1>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3.5">
        {/* Date */}
        <div>
          <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
            Date
          </label>
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-3 text-text-hint" />
            <input
              type="date"
              name="date"
              defaultValue={defaults.date}
              required
              className="w-full py-2.5 px-2.5 pl-8 text-sm font-semibold border border-border rounded-lg bg-surface text-text-primary outline-none"
            />
          </div>
        </div>

        {/* Start + End Time */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
              Start Time
            </label>
            <div className="relative">
              <Clock size={14} className="absolute left-2.5 top-3 text-text-hint" />
              <input
                type="time"
                name="startTime"
                defaultValue={defaults.startTime}
                required
                className="w-full py-2.5 px-2.5 pl-8 text-sm font-semibold border border-border rounded-lg bg-surface text-text-primary outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              defaultValue={defaults.endTime}
              className="w-full py-2.5 px-2.5 text-sm font-semibold border border-border rounded-lg bg-surface text-text-primary outline-none"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
            Location
          </label>
          <div className="relative">
            <MapPin size={14} className="absolute left-2.5 top-3 text-text-hint" />
            <input
              type="text"
              name="location"
              defaultValue={defaults.location}
              required
              placeholder="e.g. Fort Canning"
              className="w-full py-2.5 px-2.5 pl-8 text-sm border border-border rounded-lg bg-surface text-text-primary outline-none"
            />
          </div>
        </div>

        {/* Title (optional) */}
        <div>
          <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
            Title <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            name="title"
            defaultValue={defaults.title}
            placeholder={`Defaults to "Training — ${defaults.location || 'Location'}"`}
            className="w-full py-2.5 px-2.5 text-sm border border-border rounded-lg bg-surface text-text-primary outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-text-muted block mb-1 uppercase tracking-wider">
            Notes <span className="font-normal normal-case">(visible to coaches)</span>
          </label>
          <textarea
            name="notes"
            defaultValue={defaults.notes}
            placeholder="e.g. Bring water, warm-up at 7:45"
            rows={2}
            className="w-full py-2.5 px-2.5 text-sm border border-border rounded-lg bg-surface text-text-primary outline-none resize-y font-[inherit]"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle my-1" />

        {/* RSVP Deadlines */}
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
          RSVP Deadlines <span className="font-normal normal-case">(optional)</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] text-text-hint block mb-0.5">Coach deadline</label>
            <input
              type="datetime-local"
              name="coachDeadline"
              defaultValue={defaults.coachDeadline}
              className="w-full py-2 px-1.5 text-xs border border-border rounded-md bg-surface text-text-primary outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-hint block mb-0.5">Athlete deadline</label>
            <input
              type="datetime-local"
              name="athleteDeadline"
              defaultValue={defaults.athleteDeadline}
              className="w-full py-2 px-1.5 text-xs border border-border rounded-md bg-surface text-text-primary outline-none"
            />
          </div>
        </div>

        {/* Error / Success messages */}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {publishError && <p className="text-sm text-red-600">{publishError}</p>}

        {/* Action buttons */}
        <div className="flex gap-2.5 mt-2">
          <DraftButton />
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 py-3 text-sm font-bold rounded-lg bg-accent text-white border-none cursor-pointer min-h-[44px] shadow-[0_2px_8px_rgba(15,118,110,0.2)] disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>

        <p className="text-[11px] text-text-hint text-center leading-snug mt-1">
          Publishing creates RSVP slots for all active coaches and athletes, and sends notifications to everyone with session notifications enabled.
        </p>
      </form>
    </div>
  )
}

function DraftButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 py-3 text-sm font-semibold rounded-lg bg-surface text-text-secondary border border-border cursor-pointer min-h-[44px] disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save as Draft'}
    </button>
  )
}
