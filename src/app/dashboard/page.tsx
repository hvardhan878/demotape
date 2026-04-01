import { redirect } from 'next/navigation'
import { getSessionId, getDbSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const sessionId = await getSessionId()
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#030303]">
        <AppNav />
        <div className="mx-auto max-w-md px-6 py-20 text-center text-white/50">
          <p>Loading your session… refresh if this persists.</p>
        </div>
      </div>
    )
  }

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (projects && projects.length > 0) {
    redirect(`/projects/${projects[0].id}`)
  }

  const session = await getDbSession(sessionId)
  const initialHasApiKey = !!session?.encrypted_claude_key

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <DashboardClient initialHasApiKey={initialHasApiKey} />
    </div>
  )
}
