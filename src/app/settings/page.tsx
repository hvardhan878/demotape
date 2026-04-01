import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('plan, stripe_customer_id, encrypted_claude_key')
    .eq('id', userId)
    .single()

  const isPro = userRecord?.plan === 'pro'
  const hasKey = !!userRecord?.encrypted_claude_key
  const stripeCustomerId = userRecord?.stripe_customer_id ?? null

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <SettingsClient isPro={isPro} hasKey={hasKey} stripeCustomerId={stripeCustomerId} />
    </div>
  )
}
