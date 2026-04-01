import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, SESSION_HEADER } from '@/lib/session-constants'

// Ensure every browser has a session UUID cookie. On the first request the
// cookie is only on the response, so we also forward the id on the request
// via a header so Server Components can read it in the same round-trip.
export function proxy(req: NextRequest) {
  const existing = req.cookies.get(SESSION_COOKIE)?.value
  const sessionId = existing ?? crypto.randomUUID()

  const requestHeaders = new Headers(req.headers)
  if (!existing) {
    requestHeaders.set(SESSION_HEADER, sessionId)
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (!existing) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
