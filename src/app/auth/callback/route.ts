import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userRow } = await adminClient
          .from('users')
          .select('role, name')
          .eq('id', user.id)
          .single()

        const role = userRow?.role

        if (role === 'caregiver') {
          const { data: invitation } = await adminClient
            .from('invitations')
            .select('athlete_id')
            .eq('email', user.email ?? '')
            .not('athlete_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (invitation?.athlete_id) {
            // Set caregiver_user_id on the athlete row if not already set
            await adminClient
              .from('athletes')
              .update({ caregiver_user_id: user.id })
              .eq('id', invitation.athlete_id)
              .is('caregiver_user_id', null)

            return NextResponse.redirect(`${baseUrl}/athletes/${invitation.athlete_id}`)
          }
        }

        return NextResponse.redirect(`${baseUrl}/athletes`)
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`)
}
