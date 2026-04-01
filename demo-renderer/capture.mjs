/**
 * Real-time browser capture using puppeteer-screen-recorder.
 * Uses Chrome DevTools Protocol Page.startScreencast → ffmpeg H.264 pipeline.
 * Much faster than BeginFrame: a 20s animation takes ~25s wall-clock, not 3+ minutes.
 */
import puppeteer from 'puppeteer-core'
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder'
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'

mkdirSync('./out', { recursive: true })

// ── 1. Start Next.js dev server ───────────────────────────────────────────
const server = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3100'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout?.on('data', d => process.stdout.write('[next] ' + d))
server.stderr?.on('data', d => {
  const msg = d.toString()
  if (!msg.includes('chunk')) process.stderr.write('[next] ' + msg)
})

const cleanup = () => { try { server.kill() } catch {} }
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(1) })

// ── 2. Wait for the demo-record page to compile and be ready ─────────────
console.log('[capture] waiting for dev server…')
const waitForPage = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('http://localhost:3100/demo-record')
      if (res.status < 500) return
    } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('[capture] dev server did not become ready within 60 s')
}
await waitForPage()
console.log('[capture] page ready')

// ── 3. Resolve Chromium executable path ──────────────────────────────────
// PUPPETEER_EXECUTABLE_PATH is set in the Dockerfile to /usr/bin/chromium.
// Fall back to common locations if not set.
const { execSync } = await import('node:child_process')
let executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (() => {
    try {
      return execSync(
        'which chromium || which chromium-browser || which google-chrome 2>/dev/null',
        { encoding: 'utf8' }
      ).trim()
    } catch {
      return ''
    }
  })()

if (!executablePath) throw new Error('[capture] no Chrome/Chromium binary found. Set PUPPETEER_EXECUTABLE_PATH.')
console.log(`[capture] browser: ${executablePath}`)

// ── 4. Launch browser ─────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })

// ── 5. Set up recorder (CDP screencast → ffmpeg H.264 CRF 15) ────────────
const recorder = new PuppeteerScreenRecorder(page, {
  fps: 30,
  videoFrame: { width: 1280, height: 720 },
  videoCrf: 15,
  videoCodec: 'libx264',
  videoPreset: 'fast',
  aspectRatio: '16:9',
})

// ── 6. Navigate, wait for mount, then record ─────────────────────────────
await page.goto('http://localhost:3100/demo-record', { waitUntil: 'networkidle0' })
console.log('[capture] page loaded')

// Start recording before animations begin
await recorder.start('./out/demo.mp4')
console.log('[capture] recording started')

// Read total duration the component needs
// (set via window.__demoDuration = DEMO_DURATION_MS in the component's useEffect)
// Cap at 28 s — real-time recording so this is just 28s of wall-clock time
const rawDuration = await page.evaluate(() => window.__demoDuration ?? 22000)
const durationMs = Math.min(rawDuration, 28000)
console.log(`[capture] recording for ${durationMs} ms real-time`)

// Wait for the animation to finish playing in real time
await new Promise(r => setTimeout(r, durationMs + 500))

// ── 7. Finish ─────────────────────────────────────────────────────────────
await recorder.stop()
await browser.close()

const { statSync } = await import('node:fs')
const size = statSync('./out/demo.mp4').size
console.log(`[capture] done → ./out/demo.mp4 (${(size / 1024).toFixed(0)} KB)`)
if (size < 50_000) {
  console.error('[capture] ERROR: output is too small — recording likely failed')
  cleanup()
  process.exit(1)
}

cleanup()
process.exit(0)
