import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Film, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

const STATUS_CONFIG = {
  queued: { label: 'Queued', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  generating: { label: 'Generating', icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  rendering: { label: 'Rendering', icon: Loader2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  uploading: { label: 'Uploading', icon: Loader2, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
  complete: { label: 'Complete', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Ensure user exists in DB
  const { data: userRecord } = await supabaseAdmin
    .from('users')
    .select('id, plan, encrypted_claude_key')
    .eq('id', userId)
    .single()

  if (!userRecord) redirect('/onboarding')
  if (!userRecord.encrypted_claude_key) redirect('/onboarding')

  const isPro = userRecord.plan === 'pro'

  // Fetch projects with latest job status
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select(`
      id, name, description, brand_colour, video_style, created_at,
      jobs (id, status, created_at, completed_at)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const projectCount = projects?.length ?? 0

  return (
    <div className="min-h-screen bg-[#030303]">
      <AppNav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-white/40 text-sm mt-1">
              {isPro ? 'Unlimited projects' : `${projectCount}/1 projects used`}
            </p>
          </div>
          {(!isPro && projectCount >= 1) ? (
            <Link href="/settings#billing">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                Upgrade to Pro
              </Button>
            </Link>
          ) : (
            <Link href="/projects/new">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                <Plus className="w-4 h-4" /> New Project
              </Button>
            </Link>
          )}
        </div>

        {/* Free plan banner */}
        {!isPro && projectCount >= 1 && (
          <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-200/80">
              You&apos;ve used your free project.{' '}
              <Link href="/settings#billing" className="text-amber-300 hover:text-amber-200 font-medium underline underline-offset-2">
                Upgrade to Pro
              </Link>{' '}
              for unlimited projects and no watermark.
            </p>
          </div>
        )}

        {/* Project grid */}
        {projectCount === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <Film className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-white/60 font-medium mb-2">No projects yet</h3>
            <p className="text-white/30 text-sm mb-6">
              Create your first project to generate a demo video
            </p>
            <Link href="/projects/new">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                <Plus className="w-4 h-4" /> Create your first project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects?.map((project) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const jobs = (project.jobs as any[]) ?? []
              const latestJob = jobs.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              const status = latestJob?.status as keyof typeof STATUS_CONFIG | undefined
              const statusConfig = status ? STATUS_CONFIG[status] : null

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer group">
                    {/* Thumbnail placeholder */}
                    <div
                      className="h-36 rounded-t-2xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${project.brand_colour}20, ${project.brand_colour}08)`,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {status === 'complete' ? (
                        <Film className="w-8 h-8" style={{ color: project.brand_colour }} />
                      ) : (
                        <Film className="w-8 h-8 text-white/20" />
                      )}
                    </div>
                    <CardContent className="pt-4 pb-4 px-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white text-sm group-hover:text-white leading-tight truncate">
                          {project.name}
                        </h3>
                        {statusConfig && (
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-xs px-2 py-0.5 ${statusConfig.bg} ${statusConfig.color} border`}
                          >
                            {statusConfig.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                      <p className="text-xs text-white/25 mt-3">
                        {new Date(project.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
