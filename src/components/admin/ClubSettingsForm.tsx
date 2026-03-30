'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateClubSettings } from '@/app/admin/settings/actions'

type ClubSettingsFormProps = {
  name: string
  homeLocation: string | null
  sessionDay: string | null
  sessionTime: string | null
  stravaClubId: number | null
  tagline: string | null
  timezone: string
  locale: string
  stravaHashtagPrefix: string | null
  recurringSessionDay: number | null
  recurringSessionTime: string | null
  recurringSessionEnd: string | null
  recurringSessionLocation: string | null
  recurringAutoDraft: boolean
  maxAthletesPerCoach: number
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors shadow-sm"
    >
      {pending ? 'Saving...' : 'Save settings'}
    </button>
  )
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
]

function formatTime24to12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

const TIMEZONES = [
  { value: 'Pacific/Auckland', label: 'Auckland (UTC+12)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (UTC+10:30)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Kolkata', label: 'Kolkata (UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (UTC+2)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6)' },
  { value: 'America/Denver', label: 'Denver (UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'America/Anchorage', label: 'Anchorage (UTC-9)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (UTC-10)' },
]

export default function ClubSettingsForm({
  name,
  homeLocation,
  sessionDay,
  sessionTime,
  stravaClubId,
  tagline,
  timezone,
  locale,
  stravaHashtagPrefix,
  recurringSessionDay,
  recurringSessionTime,
  recurringSessionEnd,
  recurringSessionLocation,
  recurringAutoDraft,
  maxAthletesPerCoach,
}: ClubSettingsFormProps) {
  const [state, formAction] = useFormState(updateClubSettings, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Club name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={name}
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="home_location" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Home location
        </label>
        <input
          id="home_location"
          name="home_location"
          type="text"
          defaultValue={homeLocation ?? ''}
          placeholder="e.g. East Coast Park, Singapore"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="session_day" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
            Regular session day
          </label>
          <select
            id="session_day"
            name="session_day"
            defaultValue={sessionDay ?? ''}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          >
            <option value="">Not set</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="session_time" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
            Session time
          </label>
          <input
            id="session_time"
            name="session_time"
            type="text"
            defaultValue={sessionTime ?? ''}
            placeholder="e.g. 8:00 AM"
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="strava_club_id" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Strava Club ID <span className="normal-case font-normal">(optional)</span>
        </label>
        <input
          id="strava_club_id"
          name="strava_club_id"
          type="number"
          defaultValue={stravaClubId ?? ''}
          placeholder="Numeric Strava club ID"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="tagline" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Tagline
        </label>
        <input
          id="tagline"
          name="tagline"
          type="text"
          defaultValue={tagline ?? ''}
          placeholder="e.g. Growing Together"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="locale" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Locale
        </label>
        <input
          id="locale"
          name="locale"
          type="text"
          defaultValue={locale}
          placeholder="e.g. en-SG"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="timezone" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={timezone}
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        >
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>

      {/* ── Recurring Training Session Template ── */}
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Recurring Training Session</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="recurring_session_day" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Day of week
            </label>
            <select
              id="recurring_session_day"
              name="recurring_session_day"
              defaultValue={recurringSessionDay != null ? String(recurringSessionDay) : ''}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Not set</option>
              {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="recurring_session_time" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Start time
            </label>
            <select
              id="recurring_session_time"
              name="recurring_session_time"
              defaultValue={recurringSessionTime ?? ''}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Not set</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTime24to12(t)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="recurring_session_end" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              End time
            </label>
            <select
              id="recurring_session_end"
              name="recurring_session_end"
              defaultValue={recurringSessionEnd ?? ''}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Not set</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{formatTime24to12(t)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="max_athletes_per_coach" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Max athletes per coach
            </label>
            <select
              id="max_athletes_per_coach"
              name="max_athletes_per_coach"
              defaultValue={String(maxAthletesPerCoach)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="recurring_session_location" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
            Location
          </label>
          <input
            id="recurring_session_location"
            name="recurring_session_location"
            type="text"
            defaultValue={recurringSessionLocation ?? ''}
            placeholder="e.g. Fort Canning Park"
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            id="recurring_auto_draft"
            name="recurring_auto_draft"
            type="checkbox"
            defaultChecked={recurringAutoDraft}
            value="true"
            className="h-4 w-4 rounded border-border text-teal-600 focus:ring-teal-500"
          />
          <label htmlFor="recurring_auto_draft" className="text-sm text-text-secondary">
            Auto-create draft session each week
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="strava_hashtag_prefix" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Strava hashtag prefix
        </label>
        <input
          id="strava_hashtag_prefix"
          name="strava_hashtag_prefix"
          type="text"
          defaultValue={stravaHashtagPrefix ?? ''}
          placeholder="e.g. #yourclub"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-400/20 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-400/20 rounded-lg px-3 py-2">{state.success}</p>
      )}

      <SubmitButton />
    </form>
  )
}
