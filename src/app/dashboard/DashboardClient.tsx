'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clapperboard, KeyRound, ChevronRight, FolderOpen } from 'lucide-react'
import ApiKeyDialog from '@/components/ApiKeyDialog'
import WaitlistDialog from '@/components/WaitlistDialog'
import { JoinDiscordButton } from '@/components/JoinDiscordButton'
import { DEMO_PROJECT_ID } from '@/lib/demo-project'

export type DashboardProject = {
  id: string
  name: string
  description: string
  created_at: string
  video_style: string
}

type Props = {
  initialHasApiKey: boolean
  projects: DashboardProject[]
  initialWaitlistOpen?: boolean
}

export default function DashboardClient({
  initialHasApiKey,
  projects,
  initialWaitlistOpen = false,
}: Props) {
  const router = useRouter()
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey)
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(initialWaitlistOpen)
  const hasProject = projects.length > 0

  useEffect(() => {
    setHasApiKey(initialHasApiKey)
    if (initialHasApiKey) setKeyDialogOpen(false)
  }, [initialHasApiKey])

  const handleCreateProject = () => {
    if (!hasApiKey) {
      setKeyDialogOpen(true)
      return
    }
    if (hasProject) {
      setWaitlistOpen(true)
      return
    }
    router.push('/projects/new')
  }

  return (
    <>
      <ApiKeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        onSaved={() => {
          setHasApiKey(true)
          router.refresh()
        }}
      />

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        title="Join the Pro waitlist"
        description="The beta is one project per account. Join the waitlist for unlimited projects, refinements, and priority rendering."
      />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8621A] to-[#F5A623] shadow-lg shadow-orange-900/30">
            <Clapperboard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Your demos</h1>
          <p className="mt-3 text-balance text-white/45">
            Open a project to generate or download your MP4, or start another when Pro launches.
          </p>
        </div>

        <div className="mb-8">
          <Link
            href={`/projects/${DEMO_PROJECT_ID}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#F5A623]/30 bg-gradient-to-r from-[#E8621A]/[0.12] to-[#F5A623]/[0.08] px-5 py-4 transition-colors hover:border-[#F5A623]/45 hover:from-[#E8621A]/[0.18] hover:to-[#F5A623]/[0.12]"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#F5A623]">Example demo</p>
              <p className="mt-1 text-sm text-white/55">
                See a finished sample video and layout before you create your own project.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#F5A623]/70 group-hover:text-[#F5A623]" />
          </Link>
        </div>

        {!hasApiKey && !keyDialogOpen && (
          <div className="mb-8 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-center text-sm text-amber-100/90">
            <p className="mb-3">Add your Claude API key to create a project and run generations.</p>
            <Button
              type="button"
              variant="outline"
              className="border-amber-500/40 text-amber-100 hover:bg-amber-500/10"
              onClick={() => setKeyDialogOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Enter API key
            </Button>
          </div>
        )}

        {hasProject && (
          <div className="mb-8 space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-white/40">Projects</h2>
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 group-hover:text-white/70">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-white/40">{p.description}</p>
                        <p className="mt-1 text-xs text-white/30 capitalize">{p.video_style} style</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-white/25 group-hover:text-white/50" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <h2 className="text-lg font-medium text-white">New project</h2>
          <p className="mt-2 text-sm text-white/45">
            {hasProject
              ? 'You already have a project during the beta. Join the Pro waitlist for more projects and refinements.'
              : 'Create your first project — add product details, then generate a cinematic MP4.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <Button
              type="button"
              onClick={handleCreateProject}
              className="h-12 w-full bg-[#E8621A] text-base text-white hover:bg-[#F5A623] sm:w-auto sm:px-8"
            >
              {hasProject ? 'More projects (Join waitlist)' : 'Create project'}
            </Button>
            {hasProject && (
              <JoinDiscordButton
                size="lg"
                buttonClassName="h-12 w-full border-white/[0.12] text-base sm:w-auto sm:min-w-[10rem]"
              />
            )}
          </div>
          {!hasApiKey && !hasProject && (
            <p className="mt-3 text-xs text-white/35">
              You&apos;ll be asked for your Anthropic API key first if you haven&apos;t added one yet.
            </p>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-white/35">
          Key stored in{' '}
          <Link href="/settings#api-key" className="text-[#F5A623] underline-offset-2 hover:underline">
            Settings
          </Link>{' '}
          anytime.
        </p>
      </main>
    </>
  )
}
