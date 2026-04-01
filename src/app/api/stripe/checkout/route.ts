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
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single()

  let customerId = userRecord?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userRecord?.email,
      metadata: { clerkUserId: userId },
    })
    customerId = customer.id
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/dashboard?upgraded=1`,
    cancel_url: `${APP_URL}/settings#billing`,
    currency: 'gbp',
  })

  return NextResponse.json({ url: session.url })
}
