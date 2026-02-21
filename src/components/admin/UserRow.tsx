'use client'

import { useState } from 'react'
import { toggleUserActive, changeUserRole } from '@/app/admin/actions'

type Props = {
  userId: string
  email: string
  role: string
  active: boolean
  createdAt: string
  isSelf: boolean
}

export default function UserRow({ userId, email, role, active, createdAt, isSelf }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleChanging, setRoleChanging] = useState(false)

  async function handleToggle() {
    if (!active) {
      // Reactivating — no confirmation needed
      setBusy(true)
      setError(null)
      await toggleUserActive(userId, true)
      setBusy(false)
      return
    }
    // Deactivating — confirm first
    if (!window.confirm(`Deactivate ${email}? They will be signed out and lose access immediately.`)) return
    setBusy(true)
    setError(null)
    await toggleUserActive(userId, false)
    setBusy(false)
  }

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as 'coach' | 'caregiver' | 'admin'
    setRoleChanging(true)
    setError(null)
    const result = await changeUserRole(userId, newRole)
    if (result.error) setError(result.error)
    setRoleChanging(false)
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white ${!active ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-gray-900">{email}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {isSelf ? (
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          ) : (
            <select
              value={role}
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
  )
}
