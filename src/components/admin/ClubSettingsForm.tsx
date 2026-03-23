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

      <div>
        <label htmlFor="strava_hashtag_prefix" className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
          Strava hashtag prefix
        </label>
        <input
          id="strava_hashtag_prefix"
          name="strava_hashtag_prefix"
          type="text"
          defaultValue={stravaHashtagPrefix ?? ''}
          placeholder="e.g. #SOSG"
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
