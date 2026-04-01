import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { SESSION_COOKIE, getClientIp } from '@/lib/session'
import { ensureSessionRow } from '@/lib/ensure-session'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const ensured = await ensureSessionRow(sessionId)
  if (!ensured.ok) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // One project per session
  const { count: sessionCount } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((sessionCount ?? 0) >= 1) {
    return NextResponse.json(
      { error: 'demotape is currently limited to one project per session.' },
      { status: 403 }
    )
  }

  // IP rate limit — one project per IP to prevent abuse
  const ip = await getClientIp()
  if (ip !== 'unknown') {
    const { count: ipCount } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)

    if ((ipCount ?? 0) >= 1) {
      return NextResponse.json(
        { error: 'One project per network is allowed during the beta.' },
        { status: 429 }
      )
    }
  }

  const { name, description, features, brandColour, targetAudience, videoStyle } = await req.json()

  if (!name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
  }

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      session_id: sessionId,
      ip_address: ip,
      name: name.trim(),
      description: description.trim(),
      features: features ?? [],
      brand_colour: brandColour ?? '#6366f1',
      target_audience: targetAudience?.trim() || null,
      video_style: videoStyle ?? 'dark',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }

  return NextResponse.json({ id: project.id }, { status: 201 })
}
