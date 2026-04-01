import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Session = {
  id: string
  encrypted_claude_key: string | null
  created_at: string
}

export type Project = {
  id: string
  session_id: string
  ip_address: string | null
  name: string
  description: string
  features: string[]
  brand_colour: string
  target_audience: string | null
  video_style: string
  created_at: string
}

export type Job = {
  id: string
  project_id: string
  session_id: string
  status: 'queued' | 'generating' | 'rendering' | 'uploading' | 'complete' | 'failed'
  reprompt: string | null
  video_path: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}
