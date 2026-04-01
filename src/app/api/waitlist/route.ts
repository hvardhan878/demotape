import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, willingToPay } = await req.json()

  if (!email?.trim() || !willingToPay?.trim()) {
    return NextResponse.json({ error: 'email and willingToPay are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('waitlist').upsert(
    {
      email: email.trim().toLowerCase(),
      willing_to_pay: willingToPay.trim(),
      user_id: userId,
    },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('Waitlist insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
