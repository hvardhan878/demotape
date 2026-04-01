/**
 * Deterministic frame-by-frame capture using Chrome Headless Shell + BeginFrame.
 * Framer Motion animations are driven by virtual time so every frame is perfect.
 */
import { capture, launch, PuppeteerCaptureFormat } from 'puppeteer-capture'
import { getInstalledBrowsers } from '@puppeteer/browsers'
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'

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

// ── 3. Find chrome-headless-shell in the puppeteer cache ─────────────────
const cacheDir = process.env.PUPPETEER_CACHE_DIR || `${homedir()}/.cache/puppeteer`
const installed = await getInstalledBrowsers({ cacheDir })
const shell = installed.find(b => b.browser === 'chrome-headless-shell')
if (!shell) throw new Error(`chrome-headless-shell not found in puppeteer cache (${cacheDir}). Installed: ${JSON.stringify(installed.map(b => b.browser))}`)
const executablePath = shell.executablePath
console.log(`[capture] chrome-headless-shell: ${executablePath}`)

const browser = await launch({
  executablePath,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })

// ── 4. Set up recorder (30 fps, H.264 CRF 15) ────────────────────────────
// Do NOT mix `size` with a `-vf scale` in customFfmpegConfig — ffmpeg rejects both.
// Let puppeteer-capture auto-detect the frame size from the viewport.
const recorder = await capture(page, {
  fps: 30,
  format: PuppeteerCaptureFormat.MP4('fast'),
  customFfmpegConfig: async (ffmpeg) => {
    ffmpeg.outputOptions([
      '-crf', '18',
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
console.log('[capture] virtual time done, stopping recorder')

// ── 7. Finish ─────────────────────────────────────────────────────────────
await recorder.stop()
await recorder.detach()
await browser.close()

const { statSync } = await import('node:fs')
const size = statSync('./out/demo.mp4').size
console.log(`[capture] done → ./out/demo.mp4 (${size} bytes)`)
if (size < 1000) {
  console.error('[capture] ERROR: output file is suspiciously small — ffmpeg may have failed')
  process.exit(1)
}
cleanup()
process.exit(0)
