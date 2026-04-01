/**
 * test-pipeline.ts
 *
 * Standalone script to test the Daytona capture pipeline end-to-end
 * without going through the Next.js API route.
 *
 * Usage:
 *   DAYTONA_API_KEY=xxx CLAUDE_API_KEY=sk-ant-xxx npx tsx test-pipeline.ts
 *
 * Or with sample Framer Motion component (no Claude):
 *   DAYTONA_API_KEY=xxx USE_SAMPLE=1 npx tsx test-pipeline.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const SAMPLE_COMPONENT = `'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export const DEMO_DURATION_MS = 9000

export default function Demo() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__demoDuration = DEMO_DURATION_MS
    }
    const interval = setInterval(() => {
      setCount(c => {
        if (c >= 100) { clearInterval(interval); return c }
        return c + 1
      })
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ width: 1280, height: 720, overflow: 'hidden', position: 'relative', background: '#0a0a0a' }}>
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <motion.h1
          className="text-white text-6xl font-bold"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          demotape
        </motion.h1>
        <motion.div
          className="text-6xl font-mono text-orange-400"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {count}%
        </motion.div>
        <motion.p
          className="text-gray-400 text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          pipeline test — Framer Motion + Chrome Headless Shell
        </motion.p>
      </motion.div>
    </div>
  )
}
`

async function main() {
  console.log('demotape capture pipeline test\n')

  const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
  const USE_SAMPLE = process.env.USE_SAMPLE === '1' || !CLAUDE_API_KEY

  if (!DAYTONA_API_KEY) {
    console.error('DAYTONA_API_KEY is required')
    process.exit(1)
  }

  let componentCode: string

  if (USE_SAMPLE) {
    console.log('Using sample Framer Motion component (set CLAUDE_API_KEY for real Claude generation)\n')
    componentCode = SAMPLE_COMPONENT
  } else {
    console.log('Calling Claude to generate component...')
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
    console.log('Claude generation complete\n')
  }

  const outputDir = './test-output'
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)
  fs.writeFileSync(path.join(outputDir, 'component.tsx'), componentCode)
  console.log(`Generated files saved to ${outputDir}/component.tsx\n`)

  console.log('Creating Daytona sandbox...')
  const { Daytona } = await import('@daytonaio/sdk')
  const daytona = new Daytona({ apiKey: DAYTONA_API_KEY })

  const image =
    process.env.DAYTONA_RENDERER_IMAGE ||
    'ghcr.io/hvardhan878/demotape-renderer:latest'
  const sandbox = await daytona.create({ image }, { timeout: 180 })

  console.log(`Sandbox created: ${sandbox.id}\n`)

  try {
    console.log('Uploading component.tsx...')
    await sandbox.fs.uploadFile(Buffer.from(componentCode), '/app/component.tsx')

    console.log('npm install...')
    const installResult = await sandbox.process.executeCommand('npm install', '/app', undefined, 90)
    if (installResult.exitCode !== 0) {
      throw new Error(`npm install failed: ${installResult.result}`)
    }
    console.log('Install OK')

    console.log('node capture.mjs (Chrome Headless Shell + BeginFrame)...')
    const captureResult = await sandbox.process.executeCommand('node capture.mjs', '/app', undefined, 360)
    if (captureResult.exitCode !== 0) {
      throw new Error(`Capture failed: ${captureResult.result}`)
    }
    console.log(captureResult.result?.slice(-800))

    console.log('Downloading out/demo.mp4...')
    const mp4Data = await sandbox.fs.downloadFile('/app/out/demo.mp4')
    const mp4Buffer = Buffer.from(mp4Data)
    const outputPath = path.join(outputDir, 'demo.mp4')
    fs.writeFileSync(outputPath, mp4Buffer)

    console.log(`\nPipeline complete. Video: ${outputPath}`)
    console.log(`File size: ${(mp4Buffer.length / 1024).toFixed(1)} KB`)
  } finally {
    console.log('\nDeleting sandbox...')
    await daytona.delete(sandbox)
    console.log('Done')
  }
}

main().catch((err) => {
  console.error('\nPipeline failed:', err)
  process.exit(1)
})
