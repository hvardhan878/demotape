import { redirect } from 'next/navigation'
import { getSessionId, getDbSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import NewProjectClient from './NewProjectClient'

export default async function NewProjectPage() {
  const sessionId = await getSessionId()
  if (!sessionId) redirect('/dashboard')

  const { count } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((count ?? 0) >= 1) {
    redirect('/dashboard?waitlist=new')
  }

  const session = await getDbSession(sessionId)
  const initialHasApiKey = !!session?.encrypted_claude_key

  return <NewProjectClient initialHasApiKey={initialHasApiKey} />
}
