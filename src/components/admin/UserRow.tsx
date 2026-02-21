'use client'

import { useState } from 'react'
import { toggleUserActive, changeUserRole } from '@/app/admin/actions'

type AthleteOption = { id: string; name: string }

type Props = {
  userId: string
  email: string
  role: string
  active: boolean
  createdAt: string
  isSelf: boolean
  athletes: AthleteOption[]
}

export default function UserRow({ userId, email, role, active, createdAt, isSelf, athletes }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState(role)
  const [roleChanging, setRoleChanging] = useState(false)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')
  const [showAthleteSelector, setShowAthleteSelector] = useState(false)

  async function handleToggle() {
    if (!active) {
      setBusy(true)
      setError(null)
      await toggleUserActive(userId, true)
      setBusy(false)
      return
    }
    if (!window.confirm(`Deactivate ${email}? They will be signed out and lose access immediately.`)) return
    setBusy(true)
    setError(null)
    await toggleUserActive(userId, false)
    setBusy(false)
  }

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as 'coach' | 'caregiver' | 'admin'
    if (newRole === 'caregiver') {
      setCurrentRole(newRole)
      setShowAthleteSelector(true)
      return
    }
    setShowAthleteSelector(false)
    setRoleChanging(true)
    setError(null)
    const result = await changeUserRole(userId, newRole)
    if (result.error) setError(result.error)
    else setCurrentRole(newRole)
    setRoleChanging(false)
  }

  async function handleConfirmCaregiver() {
    if (!selectedAthleteId) {
      setError('Please select an athlete')
      return
    }
    setRoleChanging(true)
    setError(null)
    const result = await changeUserRole(userId, 'caregiver', selectedAthleteId)
    if (result.error) {
      setError(result.error)
      setRoleChanging(false)
      return
    }
    setShowAthleteSelector(false)
    setRoleChanging(false)
  }

  function handleCancelCaregiver() {
    setCurrentRole(role)
    setShowAthleteSelector(false)
    setSelectedAthleteId('')
    setError(null)
  }

  return (
    <div className={`px-4 py-3 bg-white ${!active ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{email}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {isSelf ? (
              <p className="text-xs text-gray-500 capitalize">{currentRole}</p>
            ) : (
              <select
                value={currentRole}
                onChange={handleRoleChange}
                disabled={roleChanging}
                className="text-xs text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
              >
                <option value="coach">Coach</option>
                <option value="caregiver">Caregiver</option>
                <option value="admin">Admin</option>
              </select>
            )}
            {!active && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                Inactive
              </span>
            )}
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">
            {new Date(createdAt).toLocaleDateString('en-SG')}
          </p>
          {!isSelf && (
            <button
              onClick={handleToggle}
              disabled={busy}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                active
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {busy ? '…' : active ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      {/* Athlete selector — shown when changing role to caregiver */}
      {showAthleteSelector && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
          <p className="text-xs font-medium text-orange-800">
            Which athlete is this caregiver linked to?
          </p>
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select athlete…</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmCaregiver}
              disabled={roleChanging || !selectedAthleteId}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
            >
              {roleChanging ? 'Saving…' : 'Confirm'}
            </button>
            <button
              onClick={handleCancelCaregiver}
              className="text-xs text-gray-500 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
