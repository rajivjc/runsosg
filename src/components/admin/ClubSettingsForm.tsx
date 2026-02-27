'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateClubSettings } from '@/app/admin/settings/actions'

type ClubSettingsFormProps = {
  name: string
  homeLocation: string | null
  sessionDay: string | null
  sessionTime: string | null
  stravaClubId: number | null
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

export default function ClubSettingsForm({
  name,
  homeLocation,
  sessionDay,
  sessionTime,
  stravaClubId,
}: ClubSettingsFormProps) {
  const [state, formAction] = useFormState(updateClubSettings, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Club name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={name}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="home_location" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Home location
        </label>
        <input
          id="home_location"
          name="home_location"
          type="text"
          defaultValue={homeLocation ?? ''}
          placeholder="e.g. East Coast Park, Singapore"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="session_day" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Regular session day
          </label>
          <select
            id="session_day"
            name="session_day"
            defaultValue={sessionDay ?? ''}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          >
            <option value="">Not set</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="session_time" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Session time
          </label>
          <input
            id="session_time"
            name="session_time"
            type="text"
            defaultValue={sessionTime ?? ''}
            placeholder="e.g. 8:00 AM"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="strava_club_id" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Strava Club ID <span className="normal-case font-normal">(optional)</span>
        </label>
        <input
          id="strava_club_id"
          name="strava_club_id"
          type="number"
          defaultValue={stravaClubId ?? ''}
          placeholder="Numeric Strava club ID"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{state.success}</p>
      )}

      <SubmitButton />
    </form>
  )
}
