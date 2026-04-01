import { getSessionId, getDbSession } from '@/lib/session'
import AppNav from '@/components/AppNav'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const sessionId = await getSessionId()
  const session = sessionId ? await getDbSession(sessionId) : null

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <SettingsClient hasKey={!!session?.encrypted_claude_key} />
    </div>
  )
}
