import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/encryption'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { claudeApiKey } = await req.json()
  if (!claudeApiKey?.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress ?? ''

  const encrypted = encryptApiKey(claudeApiKey.trim())

  // Upsert user (email satisfies NOT NULL; Clerk webhook may have created the row first)
  const { error } = await supabaseAdmin.from('users').upsert(
    {
      id: userId,
      email,
      encrypted_claude_key: encrypted,
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('Failed to upsert user:', error)
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
