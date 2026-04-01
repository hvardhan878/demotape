import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionId, getDbSession } from '@/lib/session'
import { isDemoProjectId } from '@/lib/demo-project'
import AppNav from '@/components/AppNav'
import JobPoller from '@/components/JobPoller'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Users, Clapperboard, ChevronLeft } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const sessionId = await getSessionId()
  if (!sessionId) redirect('/dashboard')

  const session = await getDbSession(sessionId)
  const isDemo = isDemoProjectId(id)

  const projectQuery = isDemo
    ? supabaseAdmin.from('projects').select('*').eq('id', id).single()
    : supabaseAdmin.from('projects').select('*').eq('id', id).eq('session_id', sessionId).single()

  const { data: project } = await projectQuery

  if (!project) notFound()

  const { data: latestJob } = await supabaseAdmin
    .from('jobs')
    .select('id, status, video_path')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const viewerCanGenerate = !isDemo || project.session_id === sessionId
  const readOnlyExample = isDemo && !viewerCanGenerate

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        {readOnlyExample && (
          <div className="mb-6 rounded-xl border border-[#F5A623]/25 bg-[#F5A623]/[0.08] px-4 py-3 text-sm text-white/80">
            <span className="font-medium text-[#F5A623]">Example project</span>
            {' — '}
            You&apos;re viewing a shared sample. Create your own project from the dashboard to generate
            a video with your product.
          </div>
        )}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{project.name}</h1>
              <p className="text-white/50 text-sm max-w-xl leading-relaxed">{project.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs gap-1.5">
                <Clapperboard className="w-3 h-3" />
                {project.video_style}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.brand_colour }} />
                {project.brand_colour}
              </Badge>
              {project.target_audience && (
                <Badge variant="outline" className="border-white/20 text-white/50 text-xs gap-1.5">
                  <Users className="w-3 h-3" />
                  {project.target_audience}
                </Badge>
              )}
            </div>
          </div>

          {project.features && project.features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(project.features as string[]).map((f: string, i: number) => (
                <span key={i} className="text-xs text-white/50 bg-white/[0.05] border border-white/[0.08] px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] mb-8" />

        <div className="space-y-2 mb-6">
          <h2 className="text-base font-semibold text-white">Demo Video</h2>
          <p className="text-sm text-white/40">
            {readOnlyExample
              ? 'Sample output from demotape. Use the dashboard to build your own.'
              : 'Generate a cinematic animated demo using your product details above.'}
          </p>
        </div>

        <JobPoller
          projectId={project.id}
          initialJobId={latestJob?.id ?? null}
          hasApiKey={!!session?.encrypted_claude_key}
          readOnlyExample={readOnlyExample}
        />
      </main>
    </div>
  )
}
