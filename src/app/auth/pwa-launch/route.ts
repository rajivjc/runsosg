import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const redirectParam = searchParams.get('redirect')
  // Validate redirect is a safe relative path (prevent open redirect)
  const destination =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/feed'

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`

  // If user already has a valid session, go to destination
  const supabase = await createClient()
  const { data: { user: existingUser } } = await supabase.auth.getUser()
  if (existingUser) {
    return NextResponse.redirect(`${baseUrl}${destination}`)
  }

  // No session — try to bootstrap from PWA token
  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // Look up user by PWA token
  const { data: userRow, error: lookupError } = await adminClient
    .from('users')
    .select('id, email, active, pwa_token_expires_at')
    .eq('pwa_token', token)
    .single()

  if (lookupError || !userRow) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // Check token expiry
  if (
    !userRow.pwa_token_expires_at ||
    new Date(userRow.pwa_token_expires_at) < new Date()
  ) {
    // Token expired — clear it and redirect to login
    await adminClient
      .from('users')
      .update({ pwa_token: null, pwa_token_expires_at: null })
      .eq('id', userRow.id)
    return NextResponse.redirect(
      `${baseUrl}/login?email=${encodeURIComponent(userRow.email)}`
    )
  }

  // Check user is still active
  if (!userRow.active) {
    return NextResponse.redirect(`${baseUrl}/login?error=revoked`)
  }

  // Generate a magic link and verify it server-side to create session
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[pwa-launch] Failed to generate magic link:', linkError)
    return NextResponse.redirect(
      `${baseUrl}/login?email=${encodeURIComponent(userRow.email)}`
    )
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('[pwa-launch] Failed to verify OTP:', verifyError)
    return NextResponse.redirect(
      `${baseUrl}/login?email=${encodeURIComponent(userRow.email)}`
    )
  }

  return NextResponse.redirect(`${baseUrl}${destination}`)
}
