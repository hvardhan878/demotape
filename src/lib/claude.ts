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

const SYSTEM_PROMPT = `You are an expert React developer and product designer. Your job is to generate a realistic, high-quality product demo video component using React and Framer Motion.

You will generate ONE file: component.tsx

THE GOAL: Make it look exactly like a screen recording of someone actually using the product. Think Loom-style product walkthroughs. The viewer should feel like they are watching a real person navigate and use the software.

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

ANIMATION PATTERNS (use Framer Motion throughout):
- Entry animations: initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: X, duration: 0.4 }}
- Stagger children: use variants with staggerChildren for lists/grids appearing
- Typing effect: manage a state string with useEffect + setInterval, appending one character at a time
- Count-up numbers: animate from 0 to target inside a useEffect with a small interval
- Micro-interactions: scale on hover via whileHover={{ scale: 1.02 }}, subtle shadows
- Use spring transitions for cards/panels: transition={{ type: 'spring', stiffness: 280, damping: 26 }}

TIMING RULES (critical for the capture harness):
- The FIRST animation must have transition.delay >= 0.5 (500 ms). This gives the browser time to mount before recording starts.
- Plan the full animation timeline. Each scene/action takes 3-5 seconds. Aim for 20-25 seconds total.
- Set DEMO_DURATION_MS to (total animation time in ms) + 1000 ms buffer. E.g. 24000 for a 23-second demo.
- NEVER exceed 25000 for DEMO_DURATION_MS.

TECHNICAL RULES:
- 'use client' directive at the top
- Use Tailwind CSS (className) for layout and static styles
- Framer Motion: import { motion, AnimatePresence } from 'framer-motion'
- Use useState + useEffect for sequencing (typing effects, delayed state changes, count-ups)
- The component is self-contained -- no external props, all data hardcoded with realistic content
- Dark theme by default unless the brand colour clearly implies light
- Fixed size: exactly 1280px wide x 720px tall, overflow hidden. Wrap everything in a div with style={{ width: 1280, height: 720, overflow: 'hidden', position: 'relative' }}
- Make every pixel count -- fill the 1280x720 canvas with a complete, polished product UI

REQUIRED EXPORTS (the capture harness reads these -- get them exactly right):

// Total milliseconds the recording needs to run (your animation length + 1500 ms buffer)
export const DEMO_DURATION_MS = <your calculated number>

// Default export: the demo component
export default function Demo() {
  useEffect(() => {
    // Signal to the capture harness how long to record
    if (typeof window !== 'undefined') {
      ;(window as any).__demoDuration = DEMO_DURATION_MS
    }
  }, [])

  // ... your component code ...
}

IMPORTS -- these packages are available:
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
(Tailwind CSS via className)

Do NOT import from 'remotion', 'next', or any other package.

OUTPUT FORMAT:
Return ONLY valid JSON with a single key: "component" (string, the full TSX code). No markdown fences, no explanation. Example: {"component": "'use client'\\nimport { useState } from 'react'\\n..."}`

export function buildUserMessage(input: ClaudeGenerationInput): string {
  const featuresList = input.features.map((f, i) => `${i + 1}. ${f}`).join('\n')
  return `Product name: ${input.productName}
Description: ${input.description}
Key features to show:
${featuresList}
Brand colour: ${input.brandColour}
Target audience: ${input.targetAudience || 'General'}
Video style: ${input.videoStyle}${input.reprompt ? `\n\nUser refinement request: ${input.reprompt}` : ''}

Generate the Framer Motion component now.`
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
