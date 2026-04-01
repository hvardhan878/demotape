import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null

  const { email, willingToPay } = await req.json()

  if (!email?.trim() || !willingToPay?.trim()) {
    return NextResponse.json({ error: 'email and willingToPay are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('waitlist').upsert(
    {
      email: email.trim().toLowerCase(),
      willing_to_pay: willingToPay.trim(),
      session_id: sessionId,
    },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('Waitlist insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
