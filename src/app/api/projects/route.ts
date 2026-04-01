import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Everyone is limited to 1 project for now
  const { count } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= 1) {
    return NextResponse.json(
      { error: 'You already have a project. demotape is currently limited to one project per user.' },
      { status: 403 }
    )
  }

  const { name, description, features, brandColour, targetAudience, videoStyle } = await req.json()

  if (!name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
  }

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id: userId,
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
