import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminInviteForm from '@/components/admin/AdminInviteForm'
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

  // Fetch pending invitations (not yet accepted)
  const { data: invitations } = await adminClient
    .from('invitations')
    .select('id, email, role, athlete_id, created_at, accepted_at')
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  // Fetch athletes for the invite form caregiver dropdown
  const { data: athletes } = await adminClient
    .from('athletes')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true })

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      {/* Invite form */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invite someone</h2>
        <AdminInviteForm athletes={athletes ?? []} />
      </section>

      {/* Pending invitations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pending invitations</h2>
        {(invitations ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No pending invitations.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {(invitations ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{inv.role}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">
                    {new Date(inv.created_at).toLocaleDateString('en-SG')}
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
        {(users ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No users yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {(users ?? []).map((u) => (
              <UserRow
                key={u.id}
                userId={u.id}
                email={emailMap[u.id] ?? '—'}
                role={u.role}
                active={u.active}
                createdAt={u.created_at}
                isSelf={u.id === currentUserId}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
