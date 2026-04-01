import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete from Supabase (cascades to projects and jobs via RLS)
  await supabaseAdmin.from('users').delete().eq('id', userId)

  // Delete Clerk account
  const clerk = await clerkClient()
  await clerk.users.deleteUser(userId)

  return NextResponse.json({ success: true })
}
