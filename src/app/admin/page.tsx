import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminInviteForm from '@/components/admin/AdminInviteForm'

export const metadata: Metadata = { title: 'Admin — SOSG Running Club' }
import UserRow from '@/components/admin/UserRow'
import CancelInviteButton from '@/components/admin/CancelInviteButton'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role guard — only admins
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/athletes')

  // Fetch users list
  const { data: users } = await adminClient
    .from('users')
    .select('id, role, active, created_at')
    .order('created_at', { ascending: false })

  // Fetch auth emails to display alongside user rows
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()
  const currentUserId = user.id
  const emailMap = Object.fromEntries(
    (authUsers ?? []).map((u) => [u.id, u.email ?? '—'])
  )

  // Fetch all invitations
  const { data: allInvitations } = await adminClient
    .from('invitations')
    .select('id, email, role, athlete_id, created_at, accepted_at')
    .order('created_at', { ascending: false })

  // Pending = invited but never signed in (last_sign_in_at is null in auth.users)
  const neverSignedInEmails = new Set(
    (authUsers ?? [])
      .filter((u) => u.last_sign_in_at == null)
      .map((u) => u.email ?? '')
      .filter(Boolean)
  )
  const invitations = (allInvitations ?? []).filter((inv) => neverSignedInEmails.has(inv.email))

  // Only show users who have actually signed in (last_sign_in_at is not null)
  const signedInIds = new Set(
    (authUsers ?? [])
      .filter((u) => u.last_sign_in_at != null)
      .map((u) => u.id)
  )
  const activeUsers = (users ?? []).filter((u) => signedInIds.has(u.id))

  // Fetch athletes for the invite form caregiver dropdown
  const { data: athletes } = await adminClient
    .from('athletes')
    .select('id, name, caregiver_user_id')
    .eq('active', true)
    .order('name', { ascending: true })

  // Build caregiver-to-athlete mapping (by user ID, for current users)
  const caregiverAthleteMap: Record<string, string> = {}
  // Build athlete ID-to-name mapping (for pending invitations)
  const athleteNameMap: Record<string, string> = {}
  for (const a of athletes ?? []) {
    athleteNameMap[a.id] = a.name
    if (a.caregiver_user_id) {
      caregiverAthleteMap[a.caregiver_user_id] = a.name
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      {/* Quick links */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/admin/milestones"
            className="bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
          >
            <span className="text-2xl">🏆</span>
            <p className="text-sm font-semibold text-gray-900 mt-2">Milestones</p>
            <p className="text-xs text-gray-500 mt-0.5">Create and manage milestone definitions</p>
          </Link>
          <Link
            href="/admin/settings"
            className="bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
          >
            <span className="text-2xl">⚙️</span>
            <p className="text-sm font-semibold text-gray-900 mt-2">Settings</p>
            <p className="text-xs text-gray-500 mt-0.5">Club name, location, session schedule</p>
          </Link>
          <Link
            href="/admin/audit"
            className="bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-teal-200 hover:bg-teal-50/30 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <p className="text-sm font-semibold text-gray-900 mt-2">Activity Log</p>
            <p className="text-xs text-gray-500 mt-0.5">View recent admin and coach actions</p>
          </Link>
        </div>
      </section>

      {/* Invite form */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invite someone</h2>
        <AdminInviteForm athletes={athletes ?? []} />
      </section>

      {/* Pending invitations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pending invitations</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-gray-500">No pending invitations.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {inv.role}
                    {inv.role === 'caregiver' && inv.athlete_id && athleteNameMap[inv.athlete_id] && (
                      <span className="ml-1 inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        Linked to {athleteNameMap[inv.athlete_id]}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-xs text-gray-400">
                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-SG') : ''}
                  </p>
                  <CancelInviteButton invitationId={inv.id} email={inv.email} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Current users */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Current users</h2>
        {activeUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {activeUsers.map((u) => (
              <UserRow
                key={u.id}
                userId={u.id}
                email={emailMap[u.id] ?? '—'}
                role={u.role}
                active={u.active}
                createdAt={u.created_at ?? ''}
                isSelf={u.id === currentUserId}
                athletes={athletes ?? []}
                linkedAthleteName={caregiverAthleteMap[u.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
