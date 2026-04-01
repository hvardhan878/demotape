'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clapperboard, KeyRound, Sparkles } from 'lucide-react'
import ApiKeyDialog from '@/components/ApiKeyDialog'

type Props = {
  initialHasApiKey: boolean
}

export default function DashboardClient({ initialHasApiKey }: Props) {
  const router = useRouter()
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey)
  const [keyDialogOpen, setKeyDialogOpen] = useState(!initialHasApiKey)

  useEffect(() => {
    setHasApiKey(initialHasApiKey)
    if (initialHasApiKey) setKeyDialogOpen(false)
  }, [initialHasApiKey])

  const handleCreateProject = () => {
    if (!hasApiKey) {
      setKeyDialogOpen(true)
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

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8621A] to-[#F5A623] shadow-lg shadow-orange-900/30">
            <Clapperboard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Create your demo</h1>
          <p className="mt-3 text-balance text-white/45">
            Describe your product once. We&apos;ll generate a short cinematic WebM you can share or
            iterate on.
          </p>
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

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <h2 className="text-lg font-medium text-white">New project</h2>
          <p className="mt-2 text-sm text-white/45">
            You can keep one project during the beta. You&apos;ll add product details and generate
            your video from the next step.
          </p>
          <Button
            type="button"
            onClick={handleCreateProject}
            className="mt-6 h-12 w-full bg-indigo-600 text-base text-white hover:bg-indigo-500 sm:w-auto sm:px-8"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Create new project
          </Button>
          {!hasApiKey && (
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
