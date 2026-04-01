import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/encryption'
import { generateDemoFiles } from '@/lib/claude'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, reprompt } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

  // Verify project belongs to user
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // Get user + decrypted API key
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('encrypted_claude_key, plan')
    .eq('id', userId)
    .single()

  if (!userRecord?.encrypted_claude_key) {
    return NextResponse.json({ error: 'Claude API key not configured' }, { status: 400 })
  }

  const claudeApiKey = decryptApiKey(userRecord.encrypted_claude_key)

  // Create job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from('jobs')
    .insert({
      project_id: projectId,
      user_id: userId,
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
  const webmBytes = await renderInDaytona(jobId, generated.component, generated.script)

  // Step 3: Upload to Supabase Storage
  await updateStatus('uploading')
  const videoPath = `${jobId}.webm`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('videos')
    .upload(videoPath, webmBytes, {
      contentType: 'video/webm',
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
  // Dynamic import to avoid bundling issues
  const { Daytona } = await import('@daytonaio/sdk')

  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!,
  })

  let sandbox: Awaited<ReturnType<typeof daytona.create>> | null = null

  try {
    const image =
      process.env.DAYTONA_RENDERER_IMAGE ||
      'ghcr.io/hvardhan878/demotape-renderer:latest'
    sandbox = await daytona.create({ image }, { timeout: 180 })

    // Write generated files
    await sandbox.fs.uploadFile(Buffer.from(componentCode), '/app/component.tsx')
    await sandbox.fs.uploadFile(Buffer.from(scriptCode), '/app/record.py')

    // Write demo-record page
    const demoPageTemplate = getDemoPageTemplate()
    await sandbox.fs.uploadFile(Buffer.from(demoPageTemplate), '/app/pages/demo-record.tsx')

    // Install, build, start Next.js
    await sandbox.process.executeCommand('npm install', '/app', undefined, 60)
    await sandbox.process.executeCommand('npm run build', '/app', undefined, 90)
    await sandbox.process.executeCommand('npm start -- -p 3100 &', '/app', undefined, 10)
    await sandbox.process.executeCommand('sleep 5', '/app')

    // Run Playwright recorder
    await sandbox.process.executeCommand('python3 record.py', '/app', undefined, 120)

    // Download WebM
    const webmData = await sandbox.fs.downloadFile('/app/recordings/demo.webm')
    return Buffer.from(webmData)
  } finally {
    if (sandbox) {
      await daytona.delete(sandbox).catch((e: Error) =>
        console.warn(`Failed to delete sandbox for job ${jobId}:`, e)
      )
    }
  }
}

function getDemoPageTemplate(): string {
  return `import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

const Demo = dynamic(() => import('../../component'), { ssr: false })

const DEMO_TOKEN = process.env.DEMO_TOKEN || ''

export default function DemoRecord() {
  const router = useRouter()

  if (typeof window !== 'undefined' && router.query.token !== DEMO_TOKEN) {
    router.replace('/')
    return null
  }

  return (
    <div style={{ width: 1280, height: 720, overflow: 'hidden', position: 'relative' }}>
      <Demo />
    </div>
  )
}
`
}
