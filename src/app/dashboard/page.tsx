import { getSessionId, getDbSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>
}) {
  const { waitlist } = await searchParams
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
    .select('id, name, description, created_at, video_style')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const session = await getDbSession(sessionId)
  const initialHasApiKey = !!session?.encrypted_claude_key
  const initialWaitlistOpen = waitlist === 'new' || waitlist === '1'

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <DashboardClient
        initialHasApiKey={initialHasApiKey}
        projects={projects ?? []}
        initialWaitlistOpen={initialWaitlistOpen}
      />
    </div>
  )
}
