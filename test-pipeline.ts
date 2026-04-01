/**
 * test-pipeline.ts
 *
 * Standalone script to test the Daytona Remotion render pipeline end-to-end
 * without going through the Next.js API route.
 *
 * Usage:
 *   DAYTONA_API_KEY=xxx CLAUDE_API_KEY=sk-ant-xxx npx tsx test-pipeline.ts
 *
 * Or with sample Remotion component (no Claude):
 *   DAYTONA_API_KEY=xxx USE_SAMPLE=1 npx tsx test-pipeline.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const SAMPLE_COMPONENT = `import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export const FPS = 30;
export const DURATION_IN_FRAMES = 30 * 8; // 8s sample

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        background: '#0a0a0a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        fontFamily: 'system-ui, sans-serif',
        opacity,
      }}
    >
      demotape pipeline test — frame {frame}
    </div>
  );
};

export default Demo;
`

async function main() {
  console.log('demotape Remotion pipeline test\n')

  const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
  const USE_SAMPLE = process.env.USE_SAMPLE === '1' || !CLAUDE_API_KEY

  if (!DAYTONA_API_KEY) {
    console.error('DAYTONA_API_KEY is required')
    process.exit(1)
  }

  let componentCode: string

  if (USE_SAMPLE) {
    console.log('Using sample Remotion component (set CLAUDE_API_KEY for real Claude generation)\n')
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

    console.log('node render.mjs...')
    const renderResult = await sandbox.process.executeCommand('node render.mjs', '/app', undefined, 300)
    if (renderResult.exitCode !== 0) {
      throw new Error(`Remotion failed: ${renderResult.result}`)
    }
    console.log(renderResult.result?.slice(-800))

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
