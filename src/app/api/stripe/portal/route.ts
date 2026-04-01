import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!userRecord?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userRecord.stripe_customer_id,
    return_url: `${APP_URL}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
