import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { SESSION_COOKIE, SESSION_HEADER } from './session-constants'

export { SESSION_COOKIE }

/** Cookie, or proxy-injected header on first visit (before Set-Cookie is visible). */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value
  if (fromCookie) return fromCookie
  const h = await headers()
  return h.get(SESSION_HEADER) ?? null
}

/** Returns the caller's IP address (Vercel / proxy aware). */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}

/** Returns the DB session row, or null if it doesn't exist yet. */
export async function getDbSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from('sessions')
    .select('id, encrypted_claude_key')
    .eq('id', sessionId)
    .single()
  return data
}
