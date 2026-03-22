'use client'

import { useState } from 'react'
import { toggleUserActive, changeUserRole, deleteUser } from '@/app/admin/actions'

type AthleteOption = { id: string; name: string }

type Props = {
  userId: string
  email: string
  role: string
  active: boolean
  createdAt: string
  isSelf: boolean
  athletes: AthleteOption[]
  linkedAthleteName?: string | null
}

export default function UserRow({ userId, email, role, active, createdAt, isSelf, athletes, linkedAthleteName }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState(role)
  const [roleChanging, setRoleChanging] = useState(false)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')
  const [showAthleteSelector, setShowAthleteSelector] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function handleDelete() {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return
    setDeleting(true)
    setError(null)
    const result = await deleteUser(userId)
    if (result.error) {
      setError(result.error)
      setDeleting(false)
    }
  }

  return (
    <div className={`px-4 py-3 bg-surface ${!active ? 'opacity-50' : ''}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {isSelf ? (
              <p className="text-xs text-text-muted capitalize">{currentRole}</p>
            ) : (
              <select
                value={currentRole}
                onChange={handleRoleChange}
                disabled={roleChanging}
                className="text-xs text-text-secondary border border-border rounded px-1.5 py-0.5 bg-surface focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
              >
                <option value="coach">Coach</option>
                <option value="caregiver">Caregiver</option>
                <option value="admin">Admin</option>
              </select>
            )}
            {!active && (
              <span className="text-xs bg-red-100 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                Inactive
              </span>
            )}
            {currentRole === 'caregiver' && !showAthleteSelector && linkedAthleteName && (
              <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-400/20 px-2 py-0.5 rounded-full">
                Linked to {linkedAthleteName}
              </span>
            )}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <p className="text-xs text-text-hint">
            {new Date(createdAt).toLocaleDateString('en-SG')}
          </p>
          {!isSelf && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggle}
                disabled={busy || deleting}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap ${
                  active
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 hover:bg-green-100'
                }`}
              >
                {busy ? '…' : active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || busy}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Athlete selector — shown when changing role to caregiver */}
      {showAthleteSelector && (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-400/20 rounded-lg space-y-2">
          <p className="text-xs font-medium text-orange-800">
            Which athlete is this caregiver linked to?
          </p>
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="w-full text-sm border border-border-strong rounded-lg px-3 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="text-xs text-text-muted px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
