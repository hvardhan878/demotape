import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/encryption'
import { generateDemoFiles } from '@/lib/claude'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const { projectId, reprompt } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  // Verify project belongs to this session
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('session_id', sessionId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Get session + decrypted API key
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('encrypted_claude_key')
    .eq('id', sessionId)
    .single()

  if (!session?.encrypted_claude_key) {
    return NextResponse.json({ error: 'Claude API key not configured' }, { status: 400 })
  }

  if (reprompt != null && String(reprompt).trim() !== '') {
    return NextResponse.json(
      {
        error:
          'Refining and regenerating demos is on the Pro waitlist. Join from the dashboard or project page.',
      },
      { status: 403 }
    )
  }

  const claudeApiKey = decryptApiKey(session.encrypted_claude_key)

  // Create job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('jobs')
    .insert({
      project_id: projectId,
      session_id: sessionId,
      status: 'queued',
      reprompt: reprompt ?? null,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  const jobId = job.id

  // Fire and forget — run render pipeline in background
  runRenderPipeline({
    jobId,
    project,
    claudeApiKey,
    reprompt,
  }).catch(async (err) => {
    console.error(`Job ${jobId} pipeline error:`, err)
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'failed', error: String(err?.message ?? err) })
      .eq('id', jobId)
  })

  return NextResponse.json({ jobId }, { status: 202 })
}

async function runRenderPipeline({
  jobId,
  project,
  claudeApiKey,
  reprompt,
}: {
  jobId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any
  claudeApiKey: string
  reprompt?: string
}) {
  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    await supabaseAdmin.from('jobs').update({ status, ...extra }).eq('id', jobId)
  }

  // Step 1: Generate with Claude
  await updateStatus('generating')
  const generated = await generateDemoFiles(claudeApiKey, {
    productName: project.name,
    description: project.description,
    features: project.features ?? [],
    brandColour: project.brand_colour,
    targetAudience: project.target_audience ?? '',
    videoStyle: project.video_style,
    reprompt,
  })

  // Step 2: Render in Daytona sandbox
  await updateStatus('rendering')
  const mp4Bytes = await renderInDaytona(jobId, generated.component)

  // Step 3: Upload to Supabase Storage
  await updateStatus('uploading')
  const videoPath = `${jobId}.mp4`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('videos')
    .upload(videoPath, mp4Bytes, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

  // Step 4: Mark complete
  await updateStatus('complete', {
    video_path: videoPath,
    completed_at: new Date().toISOString(),
  })
}

async function renderInDaytona(
  jobId: string,
  componentCode: string
): Promise<Buffer> {
  const { Daytona } = await import('@daytonaio/sdk')

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!,
  })

  let sandbox: Awaited<ReturnType<typeof daytona.create>> | null = null

  const log = (msg: string) => console.log(`[job:${jobId}] ${msg}`)

  try {
    const image =
      process.env.DAYTONA_RENDERER_IMAGE ||
      'ghcr.io/hvardhan878/demotape-renderer:latest'
    log(`Creating sandbox with image: ${image}`)
    sandbox = await daytona.create({ image }, { timeout: 180 })
    log(`Sandbox created: ${sandbox.id}`)

    // Write Claude-generated component (overwrites placeholder)
    await sandbox.fs.uploadFile(Buffer.from(componentCode), '/app/component.tsx')

    // Install deps (Remotion + React already cached in image layer; this is fast)
    log('npm install...')
    const installResult = await sandbox.process.executeCommand('npm install', '/app', undefined, 90)
    if (installResult.exitCode !== 0) {
      throw new Error(`npm install failed (exit ${installResult.exitCode}): ${installResult.result}`)
    }

    // Run Remotion renderer (bundles + renders frame-by-frame to out/demo.mp4)
    log('Running Remotion renderer...')
    const renderResult = await sandbox.process.executeCommand(
      'node render.mjs',
      '/app',
      undefined,
      300
    )
    log(`Remotion exit ${renderResult.exitCode}: ${renderResult.result?.slice(-500)}`)

    if (renderResult.exitCode !== 0) {
      throw new Error(
        `Remotion render failed (exit ${renderResult.exitCode}): ${renderResult.result?.slice(-1000)}`
      )
    }

    // Verify output
    const lsResult = await sandbox.process.executeCommand('ls -lh /app/out/', '/app')
    log(`out/ contents: ${lsResult.result}`)

    if (!lsResult.result?.includes('demo.mp4')) {
      throw new Error(`demo.mp4 not found after render. out/ contents: ${lsResult.result}`)
    }

    // Download MP4
    log('Downloading demo.mp4...')
    const mp4Data = await sandbox.fs.downloadFile('/app/out/demo.mp4')
    return Buffer.from(mp4Data)
  } finally {
    if (sandbox) {
      await daytona.delete(sandbox).catch((e: Error) =>
        console.warn(`Failed to delete sandbox for job ${jobId}:`, e)
      )
    }
  }
}

