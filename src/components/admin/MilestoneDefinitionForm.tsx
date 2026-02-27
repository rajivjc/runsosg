'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { createMilestoneDefinition } from '@/app/admin/milestones/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors shadow-sm"
    >
      {pending ? 'Creating...' : 'Create milestone'}
    </button>
  )
}

export default function MilestoneDefinitionForm() {
  const [state, formAction] = useFormState(createMilestoneDefinition, {})
  const [type, setType] = useState<'automatic' | 'manual'>('automatic')
  const [metric, setMetric] = useState('session_count')

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-[3rem_1fr] gap-3">
        <div>
          <label htmlFor="icon" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Icon
          </label>
          <input
            id="icon"
            name="icon"
            type="text"
            placeholder="🏅"
            maxLength={4}
            className="w-full border border-gray-200 rounded-lg px-2 py-2.5 text-center text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="label" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Label
          </label>
          <input
            id="label"
            name="label"
            type="text"
            required
            placeholder="e.g. First Steps, 5K Runner"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="type" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as 'automatic' | 'manual')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
        >
          <option value="automatic">Automatic (awarded by condition)</option>
          <option value="manual">Manual (awarded by coach)</option>
        </select>
      </div>

      {type === 'automatic' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="metric" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Metric
            </label>
            <select
              id="metric"
              name="metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            >
              <option value="session_count">Session count</option>
              <option value="distance_km">Single-run distance (km)</option>
              <option value="longest_run">Longest run (km)</option>
            </select>
          </div>
          <div>
            <label htmlFor="threshold" className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Threshold
            </label>
            <input
              id="threshold"
              name="threshold"
              type="number"
              min="0.01"
              step={metric === 'session_count' ? '1' : '0.01'}
              placeholder={metric === 'session_count' ? 'e.g. 10' : 'e.g. 21.1'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      )}

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
