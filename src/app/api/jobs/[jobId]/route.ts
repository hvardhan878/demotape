import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ jobId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { jobId } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('id, status, error, video_path, created_at, completed_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  let videoUrl: string | null = null
  if (job.status === 'complete' && job.video_path) {
    const { data } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUrl(job.video_path, 60 * 60 * 24) // 24hr expiry

    videoUrl = data?.signedUrl ?? null
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    error: job.error,
    videoUrl,
    createdAt: job.created_at,
    completedAt: job.completed_at,
  })
}
