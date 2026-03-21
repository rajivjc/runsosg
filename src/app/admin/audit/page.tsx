import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Activity Log — SOSG Running Club' }

type AuditRow = {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })
}

function formatFullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function describeAction(entry: AuditRow): string {
  const meta = entry.metadata ?? {}
  const email = (meta.email as string) || (meta.target_email as string) || ''
  const name = (meta.name as string) || (meta.athlete_name as string) || ''
  const role = (meta.role as string) || (meta.new_role as string) || ''

  switch (entry.action) {
    case 'user.invite':
      return `Invited ${email || 'a user'}${role ? ` as ${role}` : ''}`
    case 'user.delete':
      return `Deleted user ${email || entry.target_id || ''}`
    case 'user.deactivate':
      return `Deactivated user ${email || entry.target_id || ''}`
    case 'user.reactivate':
      return `Reactivated user ${email || entry.target_id || ''}`
    case 'user.role_change':
      return `Changed ${email || 'user'}'s role to ${role || 'unknown'}`
    case 'invitation.cancel':
      return `Cancelled invitation for ${email || entry.target_id || ''}`
    case 'athlete.create':
      return `Created athlete profile: ${name || entry.target_id || ''}`
    case 'athlete.delete':
      return `Deleted athlete profile: ${name || entry.target_id || ''}`
    case 'athlete.update':
      return `Updated athlete profile: ${name || entry.target_id || ''}`
    case 'athlete.pin_set':
      return `Set PIN for athlete: ${name || entry.target_id || ''}`
    case 'session.delete':
      return `Deleted a session${name ? ` for ${name}` : ''}`
    case 'session.create':
      return `Logged a manual session${name ? ` for ${name}` : ''}`
    case 'cues.update':
      return `Updated coaching cues${name ? ` for ${name}` : ''}`
    case 'note.delete':
      return `Deleted a coach note${name ? ` for ${name}` : ''}`
    case 'photo.delete':
      return `Deleted a photo${name ? ` for ${name}` : ''}`
    case 'sharing.enable':
      return `Enabled public sharing${name ? ` for ${name}` : ''}`
    case 'sharing.disable':
      return `Disabled public sharing${name ? ` for ${name}` : ''}`
    case 'settings.update':
      return 'Updated club settings'
    case 'milestone_def.create':
      return `Created milestone definition: ${name || (meta.title as string) || entry.target_id || ''}`
    case 'milestone_def.update':
      return `Updated milestone definition: ${name || (meta.title as string) || entry.target_id || ''}`
    case 'milestone_def.toggle':
      return `${(meta.enabled as boolean) ? 'Enabled' : 'Disabled'} milestone definition: ${name || (meta.title as string) || entry.target_id || ''}`
    case 'strava.disconnect':
      return 'Disconnected Strava'
    case 'unmatched.resolve':
      return `Linked an unmatched Strava run${name ? ` to ${name}` : ''}`
    case 'unmatched.dismiss':
      return 'Dismissed an unmatched Strava run'
    default:
      return entry.action
  }
}

function roleBadgeColor(role: string | null): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'coach':
      return 'bg-teal-50 text-teal-700 border-teal-200'
    case 'caregiver':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/feed')

  const { data: entries } = await adminClient
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const auditEntries = (entries ?? []) as AuditRow[]

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
      </div>

      {auditEntries.length === 0 ? (
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {auditEntries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">
                    {describeAction(entry)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {entry.actor_email && (
                      <span className="text-xs text-gray-500 truncate">
                        {entry.actor_email}
                      </span>
                    )}
                    {entry.actor_role && (
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${roleBadgeColor(entry.actor_role)}`}>
                        {entry.actor_role}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0"
                  title={formatFullTimestamp(entry.created_at)}
                  aria-label={formatFullTimestamp(entry.created_at)}
                >
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
