import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE } from '@/lib/session'
import { isDemoProjectId } from '@/lib/demo-project'

type Params = { params: Promise<{ jobId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { jobId } = await params
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const { data: jobRow } = await supabaseAdmin
    .from('jobs')
    .select('id, status, error, video_path, created_at, completed_at, session_id, project_id')
    .eq('id', jobId)
    .single()

  if (!jobRow) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const ownsJob = jobRow.session_id === sessionId
  const isDemoJob = jobRow.project_id && isDemoProjectId(jobRow.project_id)
  if (!ownsJob && !isDemoJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const job = {
    id: jobRow.id,
    status: jobRow.status,
    error: jobRow.error,
    video_path: jobRow.video_path,
    created_at: jobRow.created_at,
    completed_at: jobRow.completed_at,
  }

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
