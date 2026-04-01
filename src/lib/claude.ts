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

const SYSTEM_PROMPT = `You are an expert React developer and motion designer. Your job is to generate two files:

1. A React component (component.tsx) that creates a cinematic animated product demo
2. A Playwright Python script (record.py) that records it as a WebM video

RULES FOR THE REACT COMPONENT:
- Use Tailwind CSS for styling
- Use Framer Motion for all animations
- The component must be self-contained — no props needed, all data hardcoded
- It must auto-play on mount with no user interaction required
- Use realistic-looking UI — proper navigation bars, cards, buttons, data tables, chat bubbles etc
- Show 2-4 distinct "scenes" that demonstrate the product's key features
- Each scene should last 3-6 seconds before transitioning
- Dark theme preferred unless brand colour suggests otherwise
- The component renders at a fixed 1280x720 viewport
- Export as default: \`export default function Demo()\`
- The component must render at exactly 1280px wide and 720px tall, no overflow

RULES FOR THE PLAYWRIGHT SCRIPT:
- Use Python with Playwright (sync API)
- Launch Chromium headless, viewport 1280x720
- Navigate to http://localhost:3100/demo-record?token=DEMO_TOKEN
- Enable video recording to ./recordings/ directory via record_video_dir
- Calculate total recording duration by summing all Framer Motion animation durations with a 500ms buffer per scene transition — you wrote the component so you know exactly how long it takes
- Use time.sleep() to wait exactly that long
- Close the browser context to trigger the WebM file write
- After context closes, rename the output file to demo.webm (Playwright names it with a UUID by default — find and rename the newest .webm file in ./recordings/)
- Do NOT run ffmpeg — WebM output is the final deliverable

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
      model: 'claude-opus-4-5',
      max_tokens: 8096,
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
  const content = data.content?.[0]?.text

  if (!content) {
    throw new Error('No content in Claude response')
  }

  let parsed: GeneratedFiles
  try {
    parsed = JSON.parse(content)
  } catch {
    // Try extracting JSON from the response if it has extra text
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
