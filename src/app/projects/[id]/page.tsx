import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import JobPoller from '@/components/JobPoller'
import { Badge } from '@/components/ui/badge'
import { Users, Clapperboard } from 'lucide-react'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!project) notFound()

  // Get latest job
  const { data: latestJob } = await supabaseAdmin
    .from('jobs')
    .select('id, status, video_path')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Project header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{project.name}</h1>
              <p className="text-white/50 text-sm max-w-xl leading-relaxed">
                {project.description}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs gap-1.5">
                <Clapperboard className="w-3 h-3" />
                {project.video_style}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project.brand_colour }}
                />
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
                <span
                  key={i}
                  className="text-xs text-white/50 bg-white/[0.05] border border-white/[0.08] px-3 py-1 rounded-full"
                >
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
            Generate a cinematic animated demo using your product details above.
          </p>
        </div>

        <JobPoller
          projectId={project.id}
          initialJobId={latestJob?.id ?? null}
        />
      </main>
    </div>
  )
}
