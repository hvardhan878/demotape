import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

// Dashboard is a smart redirect — users only ever have one project.
// No project → /projects/new
// Has project  → /projects/[id]
export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure user exists and has a key
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('id, encrypted_claude_key')
    .eq('id', userId)
    .single()

  if (!userRecord) redirect('/onboarding')
  if (!userRecord.encrypted_claude_key) redirect('/onboarding')

  // Find their single project (if any)
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (projects && projects.length > 0) {
    redirect(`/projects/${projects[0].id}`)
  } else {
    redirect('/projects/new')
  }
}
