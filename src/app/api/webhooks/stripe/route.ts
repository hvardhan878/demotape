import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import type Stripe from 'stripe'

export const config = {
  api: { bodyParser: false },
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = session.customer as string

    await supabaseAdmin
      .from('users')
      .update({
        plan: 'pro',
        stripe_subscription_id: session.subscription as string,
      })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await supabaseAdmin
      .from('users')
      .update({
        plan: 'free',
        stripe_subscription_id: null,
      })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
