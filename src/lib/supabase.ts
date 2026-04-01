import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Project = {
  id: string
  user_id: string
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
  user_id: string
  status: 'queued' | 'generating' | 'rendering' | 'uploading' | 'complete' | 'failed'
  reprompt: string | null
  video_path: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export type User = {
  id: string
  email: string
  encrypted_claude_key: string | null
  plan: 'free' | 'pro'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
}
