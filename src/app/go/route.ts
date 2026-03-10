import { NextRequest, NextResponse } from 'next/server'

/**
 * Lightweight redirect trampoline for notification-driven navigation.
 *
 * On iOS WKWebView PWAs, navigating to the same URL (or even reloading)
 * doesn't fully tear down old compositor layers, causing stale content to
 * persist visually. By routing through this handler first, the browser is
 * forced to navigate to a different pathname (/go), which guarantees a
 * full compositor teardown. The 302 redirect then loads the target page
 * with a clean slate — no stale layers, no orphaned DOM.
 */
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to')

  // Validate: must be a safe relative path (prevent open redirect)
  if (to && to.startsWith('/') && !to.startsWith('//')) {
    return NextResponse.redirect(new URL(to, request.url))
  }

  return NextResponse.redirect(new URL('/feed', request.url))
}
