import { getSessionId, getDbSession } from '@/lib/session'
import NewProjectClient from './NewProjectClient'

export default async function NewProjectPage() {
  const sessionId = await getSessionId()
  const session = sessionId ? await getDbSession(sessionId) : null
  const initialHasApiKey = !!session?.encrypted_claude_key

  return <NewProjectClient initialHasApiKey={initialHasApiKey} />
}
