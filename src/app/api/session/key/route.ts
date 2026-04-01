import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/encryption'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionId) {
    return NextResponse.json({ error: 'No session cookie' }, { status: 401 })
  }

  const { claudeApiKey } = await req.json()
  if (!claudeApiKey?.trim()) {
    return NextResponse.json({ error: 'claudeApiKey is required' }, { status: 400 })
  }

  const encrypted = encryptApiKey(claudeApiKey.trim())

  // Upsert session row
  const { error } = await supabaseAdmin
    .from('sessions')
    .upsert({ id: sessionId, encrypted_claude_key: encrypted }, { onConflict: 'id' })

  if (error) {
    console.error('Session upsert error:', error)
    return NextResponse.json({ error: 'Failed to save key' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
