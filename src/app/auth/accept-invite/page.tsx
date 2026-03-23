import { redirect } from 'next/navigation'
import { adminClient } from '@/lib/supabase/admin'
import { AcceptInviteButton } from './accept-invite-button'
import { getClub } from '@/lib/club'

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const { token } = searchParams

  if (!token) {
    redirect('/login')
  }

  // Validate the token server-side to show appropriate UI
  const { data: invitation, error } = await adminClient
    .from('invitations')
    .select('id, email, role, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    redirect('/login?error=invalid-invite')
  }

  if (invitation.accepted_at) {
    redirect(`/login?email=${encodeURIComponent(invitation.email)}`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    redirect(
      `/login?email=${encodeURIComponent(invitation.email)}&expired=true`
    )
  }

  const club = await getClub()

  const roleLabel =
    invitation.role === 'coach'
      ? 'a coach'
      : invitation.role === 'caregiver'
        ? 'a caregiver'
        : 'an admin'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-2xl text-center">
        {/* Running icon — matches login page */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/10 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g fill="#0D9488" stroke="#0D9488" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="312" cy="135" r="32" stroke="none" />
                <line x1="298" y1="167" x2="252" y2="280" strokeWidth="42" />
                <circle cx="290" cy="193" r="16" stroke="none" />
                <circle cx="255" cy="276" r="15" stroke="none" />
                <line x1="290" y1="193" x2="342" y2="208" strokeWidth="22" />
                <circle cx="342" cy="208" r="9" stroke="none" />
                <line x1="342" y1="208" x2="354" y2="178" strokeWidth="18" />
                <line x1="290" y1="193" x2="243" y2="174" strokeWidth="22" />
                <circle cx="243" cy="174" r="9" stroke="none" />
                <line x1="243" y1="174" x2="218" y2="190" strokeWidth="18" />
                <line x1="255" y1="276" x2="318" y2="338" strokeWidth="28" />
                <circle cx="318" cy="338" r="11" stroke="none" />
                <line x1="318" y1="338" x2="354" y2="320" strokeWidth="23" />
                <line x1="255" y1="276" x2="198" y2="342" strokeWidth="28" />
                <circle cx="198" cy="342" r="11" stroke="none" />
                <line x1="198" y1="342" x2="166" y2="365" strokeWidth="23" />
              </g>
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          Welcome to {club.name}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          You have been invited to join as <strong>{roleLabel}</strong>.
        </p>

        <AcceptInviteButton token={token} />

        <noscript>
          <p className="text-sm text-text-secondary mt-4">
            JavaScript is required to accept this invitation.{' '}
            <a
              href={`/login?email=${encodeURIComponent(invitation.email)}`}
              className="text-teal-600 dark:text-teal-300 underline"
            >
              Sign in manually
            </a>
          </p>
        </noscript>

        <p className="text-xs text-text-hint mt-4">
          By accepting, you will be signed in automatically.
        </p>
      </div>
    </main>
  )
}
