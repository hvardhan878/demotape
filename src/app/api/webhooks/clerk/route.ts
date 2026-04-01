import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 500 })
  }

  const headersList = await headers()
  const svix_id = headersList.get('svix-id')
  const svix_timestamp = headersList.get('svix-timestamp')
  const svix_signature = headersList.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: { type: string; data: { id: string; email_addresses: Array<{ email_address: string }> } }

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as typeof evt
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses } = evt.data
    const email = email_addresses?.[0]?.email_address

    await supabaseAdmin.from('users').upsert(
      { id, email: email ?? '', plan: 'free' },
      { onConflict: 'id' }
    )
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data
    await supabaseAdmin.from('users').delete().eq('id', id)
  }

  return NextResponse.json({ received: true })
}
