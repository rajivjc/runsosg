import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { adminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const PWA_TOKEN_EXPIRY_DAYS = 30

export async function GET(request: NextRequest) {
  let userId: string | null = null

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() { /* read-only */ },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Auth check failed
  }

  if (!userId) {
    return NextResponse.json({ token: null }, { status: 401 })
  }

  const pwaToken = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + PWA_TOKEN_EXPIRY_DAYS)

  await adminClient
    .from('users')
    .update({
      pwa_token: pwaToken,
      pwa_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId)

  return NextResponse.json(
    { token: pwaToken },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  )
}
