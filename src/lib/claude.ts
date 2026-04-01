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
}

const SYSTEM_PROMPT = `You are an expert React and Remotion developer and product designer. Your job is to generate a realistic, high-quality product demo video component using Remotion.

You will generate ONE file: component.tsx

THE GOAL: Make it look exactly like a screen recording of someone actually using the product. Think Loom-style product walkthroughs. The viewer should feel like they are watching a real person navigate and use the software.

HOW REMOTION WORKS (read carefully -- this is different from normal React):
- Remotion renders each video frame independently. There is NO real-time clock, NO setInterval, NO setTimeout that fires during rendering.
- The ONLY way to drive animations is via useCurrentFrame() which returns the current frame number (0, 1, 2, ...).
- Use interpolate(frame, [startFrame, endFrame], [startValue, endValue], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) to map frames to values.
- FPS is 30. So 1 second = 30 frames, 2 seconds = 60 frames, etc.
- For multi-step sequences, calculate explicit frame offsets: step1 starts at frame 0, step2 starts at frame 60 (2s), step3 at frame 120, etc.

ANIMATION PATTERNS:

Fade in over 0.5s starting at frame 60:
const opacity = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

Slide in from right over 0.4s starting at frame 90:
const x = interpolate(frame, [90, 102], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

Show element only after frame 30:
const visible = frame >= 30

Count-up animation for a number from 0 to 142 over 1s starting at frame 30:
const count = Math.round(interpolate(frame, [30, 60], [0, 142], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))

Typing effect for "Hello world" (11 chars, ~2.4 frames per char at 30fps):
const charsVisible = Math.floor(interpolate(frame, [30, 57], [0, 11], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
const text = "Hello world".slice(0, charsVisible)

WHAT TO BUILD:
- Render a SINGLE, CONTINUOUS product interface -- like a real app screen the user is already inside
- Show the full product UI: sidebar/nav, main content area, toolbars, status bars -- whatever the product would actually have
- Animate ACTIONS happening inside the UI: a message being typed and sent, a row being added to a table, a chart updating, a form being submitted, a modal opening, a notification appearing, data loading in
- Each "action" should feel like a user just performed it -- cursor implied, UI responds naturally
- NEVER use pagination dots, slide indicators, "Scene 1/4" labels, title cards, or anything that looks like a presentation
- NEVER fade the whole screen to black between moments -- keep the UI persistent, just animate changes within it
- NEVER show a marketing headline or tagline overlay
- Data in the UI must look real and specific to the product -- not "Lorem ipsum", not "User 1", not "Feature A". Use realistic names, numbers, messages, statuses

WHAT GOOD LOOKS LIKE:
- A CRM: the dashboard is visible, a new contact row slides in, then a detail panel fades open, then an email draft types itself in
- A chat tool: the conversation thread is visible, a new message types in character-by-character, a typing indicator appears then a reply fades in
- An analytics tool: a dashboard with live-looking charts, a metric card counting up, a table row highlighting when a threshold is crossed
- A project manager: a kanban board with a card sliding between columns, a task expanding inline, a comment appearing

TECHNICAL RULES:
- Use Tailwind CSS (className) for layout and static styles -- it is available in the Remotion environment
- Use inline style props with interpolated values for animated properties (opacity, transform, etc.)
- DO NOT use Framer Motion -- it conflicts with Remotion's frame-based renderer. Use only interpolate and useCurrentFrame.
- The component is self-contained -- no external props, all data hardcoded with realistic content
- Dark theme by default unless the brand colour clearly implies light
- Fixed size: exactly 1280px wide x 720px tall, overflow hidden
- Total duration: 20-28 seconds (600-840 frames at 30fps). Aim for ~24 seconds (720 frames).
- Make every pixel count -- fill the 1280x720 canvas with a complete, polished product UI

REQUIRED EXPORTS -- the file MUST export exactly these (the rendering harness depends on them):
export const FPS = 30;
export const DURATION_IN_FRAMES = <your calculated frame count>;
export const Demo: React.FC = () => { ... };
export default Demo;

IMPORTS -- only use these (no other packages are available):
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill, Sequence } from 'remotion';

OUTPUT FORMAT:
Return ONLY valid JSON with a single key: "component" (string, the full TSX code). No markdown fences, no explanation. Example: {"component": "import React from 'react';\\n..."}`

export function buildUserMessage(input: ClaudeGenerationInput): string {
  const featuresList = input.features.map((f, i) => `${i + 1}. ${f}`).join('\n')
  return `Product name: ${input.productName}
Description: ${input.description}
Key features to show:
${featuresList}
Brand colour: ${input.brandColour}
Target audience: ${input.targetAudience || 'General'}
Video style: ${input.videoStyle}${input.reprompt ? `\n\nUser refinement request: ${input.reprompt}` : ''}

Generate the Remotion component now.`
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

  const stopReason = data.stop_reason as string | undefined
  if (stopReason === 'max_tokens') {
    throw new Error(
      'Claude response was truncated (max_tokens reached). Try a simpler description or fewer features.'
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
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse JSON from Claude response')
    parsed = JSON.parse(jsonMatch[0])
  }

  if (!parsed.component || typeof parsed.component !== 'string' || parsed.component.trim() === '') {
    throw new Error('Claude response missing valid "component" field')
  }

  return parsed
}
