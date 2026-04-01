import { supabaseAdmin } from '@/lib/supabase'

/** Ensures a `sessions` row exists so `projects.session_id` FK inserts succeed (key may be null). */
export async function ensureSessionRow(sessionId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin.from('sessions').insert({ id: sessionId })
  if (!error) return { ok: true }
  if (error.code === '23505') return { ok: true }
  console.error('ensureSessionRow:', error)
  return { ok: false, message: error.message }
}
