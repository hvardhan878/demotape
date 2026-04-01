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
  const mp4Bytes = await renderInDaytona(jobId, generated.component, generated.script)

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
  componentCode: string,
  scriptCode: string
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

    // Write Claude-generated files
    await sandbox.fs.uploadFile(Buffer.from(componentCode), '/app/component.tsx')
    await sandbox.fs.uploadFile(Buffer.from(scriptCode), '/app/record.py')

    // Write the demo-record page — no token check since this is an ephemeral private sandbox
    await sandbox.fs.uploadFile(Buffer.from(getDemoPageTemplate()), '/app/pages/demo-record.tsx')

    // Ensure recordings directory exists before Playwright runs
    await sandbox.process.executeCommand('mkdir -p /app/recordings', '/app')

    // Install deps
    log('npm install...')
    const installResult = await sandbox.process.executeCommand('npm install', '/app', undefined, 90)
    if (installResult.exitCode !== 0) {
      throw new Error(`npm install failed (exit ${installResult.exitCode}): ${installResult.result}`)
    }

    // Build Next.js
    log('npm run build...')
    const buildResult = await sandbox.process.executeCommand('npm run build', '/app', undefined, 120)
    if (buildResult.exitCode !== 0) {
      throw new Error(`npm build failed (exit ${buildResult.exitCode}): ${buildResult.result}`)
    }

    // Start Next.js in background and wait for it to be ready
    log('Starting Next.js...')
    await sandbox.process.executeCommand(
      'nohup npm start -- -p 3100 > /app/server.log 2>&1 &',
      '/app',
      undefined,
      10
    )
    // Poll until the server responds (up to 15 seconds)
    await sandbox.process.executeCommand(
      'for i in $(seq 1 15); do curl -sf http://localhost:3100 && break || sleep 1; done',
      '/app',
      undefined,
      20
    )

    // Run Playwright recorder
    log('Running Playwright recorder...')
    const playwrightResult = await sandbox.process.executeCommand(
      'python3 record.py',
      '/app',
      { DEMO_TOKEN: 'internal' },
      120
    )
    log(`Playwright exit ${playwrightResult.exitCode}: ${playwrightResult.result}`)

    if (playwrightResult.exitCode !== 0) {
      throw new Error(
        `Playwright recorder failed (exit ${playwrightResult.exitCode}): ${playwrightResult.result}`
      )
    }

    // Verify the file exists before downloading
    const lsResult = await sandbox.process.executeCommand('ls -lh /app/recordings/', '/app')
    log(`recordings/ contents: ${lsResult.result}`)

    if (!lsResult.result?.includes('demo.mp4')) {
      throw new Error(
        `demo.mp4 not found after recording/encoding. recordings/ contents: ${lsResult.result}`
      )
    }

    // Download MP4
    log('Downloading demo.mp4...')
    const mp4Data = await sandbox.fs.downloadFile('/app/recordings/demo.mp4')
    return Buffer.from(mp4Data)
  } finally {
    if (sandbox) {
      await daytona.delete(sandbox).catch((e: Error) =>
        console.warn(`Failed to delete sandbox for job ${jobId}:`, e)
      )
    }
  }
}

function getDemoPageTemplate(): string {
  // No token check — this page only exists inside an ephemeral private Daytona sandbox.
  return `import dynamic from 'next/dynamic'

const Demo = dynamic(() => import('../component'), { ssr: false })

export default function DemoRecord() {
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      <Demo />
    </div>
  )
}
`
}
