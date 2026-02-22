import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/feed',
  '/athletes',
  '/admin',
  '/account',
  '/api/strava/connect',
  '/api/strava/callback',
]

const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/api/strava/webhook',
  '/api/health',
  '/',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (isProtected(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in, check active flag
  if (user && isProtected(pathname)) {
    const { data: userRow } = await supabase
      .from('users')
      .select('active')
      .eq('id', user.id)
      .single()

    if (userRow && userRow.active === false) {
      // Sign out and redirect to login with revoked message
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = '?error=revoked'
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
