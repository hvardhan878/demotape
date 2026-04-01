export type ClaudeGenerationInput = {
  productName: string
  description: string
  features: string[]
  brandColour: string
  targetAudience: string
  videoStyle: string
  reprompt?: string
}

export type GeneratedFiles = {
  component: string
  script: string
}

const SYSTEM_PROMPT = `You are an expert React developer and product designer. Your job is to generate a realistic, interactive-looking product demo video component — NOT a slideshow or marketing presentation.

You will generate two files:
1. A React component (component.tsx) — a working-looking demo of the actual product UI
2. A Playwright Python script (record.py) that records it as a video

THE GOAL: Make it look exactly like a screen recording of someone actually using the product. Think Loom-style product walkthroughs. The viewer should feel like they are watching a real person navigate and use the software.

RULES FOR THE REACT COMPONENT:

WHAT TO BUILD:
- Render a SINGLE, CONTINUOUS product interface — like a real app screen the user is already inside
- Show the full product UI: sidebar/nav, main content area, toolbars, status bars — whatever the product would actually have
- Animate ACTIONS happening inside the UI: a message being typed and sent, a row being added to a table, a chart updating, a form being submitted, a modal opening, a notification appearing, data loading in
- Each "action" should feel like a user just performed it — cursor implied, UI responds naturally
- NEVER use pagination dots, slide indicators, "Scene 1/4" labels, title cards, or anything that looks like a presentation
- NEVER fade the whole screen to black between moments — keep the UI persistent, just animate changes within it
- NEVER show a marketing headline or tagline overlay
- Data in the UI must look real and specific to the product — not "Lorem ipsum", not "User 1", not "Feature A". Use realistic names, numbers, messages, statuses

WHAT GOOD LOOKS LIKE:
- A CRM: the dashboard is visible, a new contact row animates in, then a detail panel slides open, then an email draft appears
- A chat tool: the conversation thread is visible, a new message types in character-by-character, the other party responds with a typing indicator then a reply
- An analytics tool: a dashboard with live-looking charts, a metric card ticking up, a table row highlighting when a threshold is crossed
- A project manager: a kanban board with cards moving between columns, a task expanding inline to show details, a comment appearing

TECHNICAL RULES:
- Use Tailwind CSS for all styling
- Use Framer Motion for all animations (useAnimate or motion components with variants/keyframes)
- The component is self-contained — no props, all data hardcoded with realistic content
- Auto-plays on mount, zero user interaction required
- Dark theme by default unless the brand colour clearly implies light
- Fixed size: exactly 1280px wide × 720px tall, overflow hidden, no scrollbars
- Export as default: \`export default function Demo()\`
- Animate with realistic timing: typing effects ~80ms per character, UI transitions 200-400ms, data loads 600-1200ms
- Total duration should be 18-30 seconds of continuous product action
- Use React hooks (useState, useEffect, useRef) alongside Framer Motion to drive sequential timed actions
- Make every pixel count — fill the 1280×720 canvas with a complete, polished product UI

RULES FOR THE PLAYWRIGHT SCRIPT:
- Use Python with Playwright (sync API)
- Launch Chromium headless, viewport 1280x720
- Navigate to http://localhost:3100/demo-record (no token needed)
- Enable video recording to ./recordings/ directory via record_video_dir with size {"width": 1280, "height": 720}
- Calculate total recording duration by summing all Framer Motion animation durations with a 500ms buffer per scene transition — you wrote the component so you know exactly how long it takes
- Use time.sleep() to wait exactly that long
- Close the browser context to trigger the WebM file write
- After context closes, rename the output file to demo.webm (Playwright names it with a UUID by default — find and rename the newest .webm file in ./recordings/)
- After renaming to demo.webm, run ffmpeg to produce a high-quality H.264 MP4:
  import subprocess
  subprocess.run([
      'ffmpeg', '-y',
      '-i', './recordings/demo.webm',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      './recordings/demo.mp4'
  ], check=True)
- The final deliverable is demo.mp4 — demo.webm is only an intermediate file

OUTPUT FORMAT:
Return ONLY valid JSON with two keys: "component" (string, the full TSX code) and "script" (string, the full Python code). No markdown, no explanation, just the raw JSON object.`

export function buildUserMessage(input: ClaudeGenerationInput): string {
  const featuresList = input.features.map((f, i) => `${i + 1}. ${f}`).join('\n')
  return `Product name: ${input.productName}
Description: ${input.description}
Key features to show:
${featuresList}
Brand colour: ${input.brandColour}
Target audience: ${input.targetAudience || 'General'}
Video style: ${input.videoStyle}${input.reprompt ? `\n\nUser refinement request: ${input.reprompt}` : ''}

Generate the component and Playwright script now.`
}

export async function generateDemoFiles(
  apiKey: string,
  input: ClaudeGenerationInput
): Promise<GeneratedFiles> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      // claude-sonnet-4-5 supports up to 64 000 output tokens.
      // Component + script JSON can easily exceed 8 k tokens, bumping to 16 k
      // gives plenty of headroom while keeping latency reasonable.
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} ${error}`)
  }

  const data = await response.json()

  // Detect truncated response before touching the content
  const stopReason = data.stop_reason as string | undefined
  if (stopReason === 'max_tokens') {
    throw new Error(
      'Claude response was truncated (max_tokens reached). The generated output was too long — try a simpler description or fewer features.'
    )
  }

  const content = data.content?.[0]?.text

  if (!content) {
    throw new Error('No content in Claude response')
  }

  let parsed: GeneratedFiles
  try {
    parsed = JSON.parse(content)
  } catch {
    // Try extracting JSON from the response if it contains extra preamble/postamble
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse JSON from Claude response')
    parsed = JSON.parse(jsonMatch[0])
  }

  if (!parsed.component || typeof parsed.component !== 'string' || parsed.component.trim() === '') {
    throw new Error('Claude response missing valid "component" field')
  }
  if (!parsed.script || typeof parsed.script !== 'string' || parsed.script.trim() === '') {
    throw new Error('Claude response missing valid "script" field')
  }

  return parsed
}
