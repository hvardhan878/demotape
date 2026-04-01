/**
 * test-pipeline.ts
 *
 * Standalone script to test the Daytona render pipeline end-to-end
 * without going through the Next.js API route.
 *
 * Usage:
 *   DAYTONA_API_KEY=xxx CLAUDE_API_KEY=sk-ant-xxx npx ts-node test-pipeline.ts
 *
 * Or with tsx:
 *   DAYTONA_API_KEY=xxx CLAUDE_API_KEY=sk-ant-xxx npx tsx test-pipeline.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// --- Sample generated files for testing without calling Claude ---

const SAMPLE_COMPONENT = `
'use client'
import { motion } from 'framer-motion'

export default function Demo() {
  return (
    <div className="w-[1280px] h-[720px] bg-gray-950 flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <motion.h1
          className="text-6xl font-bold text-white mb-4"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Product Demo
        </motion.h1>
        <motion.p
          className="text-xl text-gray-400"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          Cinematic. Automated. AI-Generated.
        </motion.p>
      </motion.div>
    </div>
  )
}
`

const SAMPLE_SCRIPT = `
import time
import os
import glob
from playwright.sync_api import sync_playwright

DEMO_TOKEN = os.environ.get('DEMO_TOKEN', 'test-token')

def run():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            '',
            headless=True,
            viewport={'width': 1280, 'height': 720},
            record_video_dir='./recordings/',
            record_video_size={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        page.goto(f'http://localhost:3100/demo-record?token={DEMO_TOKEN}')
        # Wait for animations: ~3s total + 500ms buffer
        time.sleep(3.5)
        context.close()

    # Rename Playwright's UUID-named file to demo.webm
    recordings = glob.glob('./recordings/*.webm')
    if recordings:
        latest = max(recordings, key=os.path.getctime)
        target = './recordings/demo.webm'
        if latest != target:
            os.rename(latest, target)
        print(f'Recording saved to {target}')
    else:
        print('No recording found!')

if __name__ == '__main__':
    run()
`

async function main() {
  console.log('🚀 DemoForge Pipeline Test\n')

  const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
  const USE_SAMPLE = process.env.USE_SAMPLE === '1' || !CLAUDE_API_KEY

  if (!DAYTONA_API_KEY) {
    console.error('❌ DAYTONA_API_KEY is required')
    process.exit(1)
  }

  let componentCode: string
  let scriptCode: string

  if (USE_SAMPLE) {
    console.log('📝 Using sample component (set CLAUDE_API_KEY to use real Claude generation)\n')
    componentCode = SAMPLE_COMPONENT
    scriptCode = SAMPLE_SCRIPT
  } else {
    console.log('🤖 Calling Claude to generate component...')
    // Dynamic import
    const { generateDemoFiles } = await import('./src/lib/claude')
    const result = await generateDemoFiles(CLAUDE_API_KEY!, {
      productName: 'TestApp',
      description: 'A beautiful SaaS dashboard for monitoring team productivity',
      features: ['Real-time metrics', 'Team leaderboard', 'AI insights'],
      brandColour: '#6366f1',
      targetAudience: 'Engineering managers',
      videoStyle: 'dark',
    })
    componentCode = result.component
    scriptCode = result.script
    console.log('✅ Claude generation complete\n')
  }

  // Optionally save generated files locally for inspection
  const outputDir = './test-output'
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)
  fs.writeFileSync(path.join(outputDir, 'component.tsx'), componentCode)
  fs.writeFileSync(path.join(outputDir, 'record.py'), scriptCode)
  console.log(`💾 Generated files saved to ${outputDir}/\n`)

  console.log('🏗  Creating Daytona sandbox...')
  const { Daytona } = await import('@daytonaio/sdk')
  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY })

  const image =
    process.env.DAYTONA_RENDERER_IMAGE || 'ghcr.io/yourorg/demo-renderer:latest'
  const sandbox = await daytona.create({ image }, { timeout: 180 })

  console.log(`✅ Sandbox created: ${sandbox.id}\n`)

  try {
    console.log('📤 Uploading files to sandbox...')
    await sandbox.fs.uploadFile(Buffer.from(componentCode), '/app/component.tsx')
    await sandbox.fs.uploadFile(Buffer.from(scriptCode), '/app/record.py')

    const demoPage = fs.readFileSync(
      path.join(__dirname, 'demo-renderer/pages/demo-record.tsx'),
      'utf8'
    )
    await sandbox.fs.uploadFile(Buffer.from(demoPage), '/app/pages/demo-record.tsx')

    console.log('📦 Installing dependencies...')
    await sandbox.process.executeCommand('npm install', '/app', undefined, 60)

    console.log('🔨 Building Next.js...')
    await sandbox.process.executeCommand('npm run build', '/app', undefined, 90)

    console.log('▶️  Starting Next.js server...')
    await sandbox.process.executeCommand('npm start -- -p 3100 &', '/app', undefined, 10)
    await sandbox.process.executeCommand('sleep 5', '/app')

    console.log('🎬 Running Playwright recorder...')
    const result = await sandbox.process.executeCommand('python3 record.py', '/app', undefined, 120)
    console.log('Recorder output:', result.result || result)

    console.log('📥 Downloading WebM...')
    const webmData = await sandbox.fs.downloadFile('/app/recordings/demo.webm')
    const webmBuffer = Buffer.from(webmData)
    const outputPath = path.join(outputDir, 'demo.webm')
    fs.writeFileSync(outputPath, webmBuffer)

    console.log(`\n✅ Pipeline complete! Video saved to: ${outputPath}`)
    console.log(`   File size: ${(webmBuffer.length / 1024).toFixed(1)} KB`)
  } finally {
    console.log('\n🧹 Cleaning up sandbox...')
    await daytona.delete(sandbox)
    console.log('✅ Done')
  }
}

main().catch((err) => {
  console.error('\n❌ Pipeline failed:', err)
  process.exit(1)
})
