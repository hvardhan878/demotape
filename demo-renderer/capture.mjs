/**
 * Deterministic frame-by-frame capture using Chrome Headless Shell + BeginFrame.
 * Framer Motion animations are driven by virtual time so every frame is perfect.
 */
import { capture, launch, PuppeteerCaptureFormat } from 'puppeteer-capture'
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'

mkdirSync('./out', { recursive: true })

// ── 1. Start Next.js dev server ──────────────────────────────────────────────
const server = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3100'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout?.on('data', d => process.stdout.write('[next] ' + d))
server.stderr?.on('data', d => {
  const msg = d.toString()
  // Suppress noisy HMR lines
  if (!msg.includes('chunk')) process.stderr.write('[next] ' + msg)
})

const cleanup = () => { try { server.kill() } catch {} }
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(1) })

// ── 2. Wait for the demo-record page to be compiled and ready ───────────────
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

// ── 3. Launch Chrome Headless Shell with deterministic-mode flags ─────────
// puppeteer-core needs an explicit path; use puppeteer's browser cache
const executablePath = puppeteer.executablePath('chrome-headless-shell')
console.log(`[capture] chrome-headless-shell: ${executablePath}`)

const browser = await launch({
  executablePath,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--force-device-scale-factor=2',   // 2560×1440 internal → downscaled by ffmpeg
  ],
})
const page = await browser.newPage()
// CSS viewport: 1280×720; physical pixels: 2560×1440 (device scale = 2)
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 })

// ── 4. Set up recorder (30 fps, H.264 CRF 15) ────────────────────────────
const recorder = await capture(page, {
  fps: 30,
  size: '1280x720',            // ffmpeg scales 2560×1440 → 1280×720 (lanczos)
  format: PuppeteerCaptureFormat.MP4('slow'),
  customFfmpegConfig: async (ffmpeg) => {
    ffmpeg.outputOptions([
      '-vf', 'scale=1280:720:flags=lanczos',
      '-crf', '15',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
    ])
  },
})

// ── 5. Navigate and let React fully hydrate ───────────────────────────────
await page.goto('http://localhost:3100/demo-record', { waitUntil: 'networkidle0' })
console.log('[capture] page loaded')

// Real-time wait: component mounts and fires useEffect to set window.__demoDuration.
// The component's first animation has a ≥500 ms delay, so 900 ms is safely ahead
// of any animation that would start before recording begins.
await new Promise(r => setTimeout(r, 900))

// ── 6. Record: BeginFrame drives virtual time, Framer Motion follows ───────
await recorder.start('./out/demo.mp4')
console.log('[capture] recording started (deterministic virtual time)')

const durationMs = await page.evaluate(() => window.__demoDuration ?? 28000)
console.log(`[capture] recording ${durationMs} ms of virtual time at 30 fps`)

await recorder.waitForTimeout(durationMs)

// ── 7. Finish ─────────────────────────────────────────────────────────────
await recorder.stop()
await recorder.detach()
await browser.close()
console.log('[capture] done → ./out/demo.mp4')
cleanup()
process.exit(0)
