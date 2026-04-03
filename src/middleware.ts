import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = [
  '/dashboard',
  '/feed',
  '/athletes',
  '/admin',
  '/account',
  '/sessions',
  '/notifications',
  '/welcome',
  '/digest',
  '/strava/consent',
  '/api/strava/connect',
  '/api/strava/callback',
]

const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/accept-invite',
  '/auth/pwa-launch',
  '/setup',
  '/about',
  '/demo',
  '/privacy',
  '/terms',
  '/strava/connected',
  '/api/strava/webhook',
  '/api/health',
  '/api/pwa-token',
  '/my',
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
  const { pathname } = request.nextUrl

  // Skip auth entirely for public paths — no Supabase call needed
  if (isPublic(pathname)) {
    return NextResponse.next({ request })
  }

  // For non-protected, non-public paths (e.g. _next, static), pass through
  if (!isProtected(pathname)) {
    return NextResponse.next({ request })
  }

  // Only create Supabase client and call getUser() for protected paths
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
            response.cookies.set(name, value, {
              ...options,
              maxAge: 60 * 60 * 24 * 365, // 1 year — fight mobile browser cookie purging (ITP)
              sameSite: 'lax',
              secure: true,
              httpOnly: true,
              path: '/',
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Check active flag and role for authenticated users on protected routes
  const { data: userRow } = await supabase
    .from('users')
    .select('active, role, can_manage_sessions')
    .eq('id', user.id)
    .single()

  if (!userRow) {
    // User exists in auth but not in users table — redirect to onboarding
    const setupUrl = request.nextUrl.clone()
    setupUrl.pathname = '/setup'
    return NextResponse.redirect(setupUrl)
  }

  if (userRow.active === false) {
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = '?error=revoked'
    return NextResponse.redirect(loginUrl)
  }

  // Admin route access control
  if (pathname.startsWith('/admin')) {
    const isAdminSessionsRoute =
      pathname === '/admin/sessions' || pathname.startsWith('/admin/sessions/')

    if (isAdminSessionsRoute) {
      // /admin/sessions/*: allow admin OR coaches with can_manage_sessions
      const allowed =
        userRow.role === 'admin' ||
        (userRow.role === 'coach' && userRow.can_manage_sessions === true)
      if (!allowed) {
        const homeUrl = request.nextUrl.clone()
        homeUrl.pathname = '/'
        return NextResponse.redirect(homeUrl)
      }
    } else {
      // All other /admin/* routes: admin only
      if (userRow.role !== 'admin') {
        const homeUrl = request.nextUrl.clone()
        homeUrl.pathname = '/'
        return NextResponse.redirect(homeUrl)
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
