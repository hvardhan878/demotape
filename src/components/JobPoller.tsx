'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import WaitlistDialog from '@/components/WaitlistDialog'

type JobStatus = 'queued' | 'generating' | 'rendering' | 'uploading' | 'complete' | 'failed'

type JobState = {
  id: string
  status: JobStatus
  error?: string
  videoUrl?: string
}

const STATUS_STEPS: JobStatus[] = ['queued', 'generating', 'rendering', 'uploading', 'complete']

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Preparing project',
  generating: 'Drafting layout',
  rendering: 'Recording playback',
  uploading: 'Finalizing video',
  complete: 'Ready',
  failed: 'Failed',
}

const getProgress = (status: JobStatus): number => {
  const idx = STATUS_STEPS.indexOf(status)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100)
}

type Props = {
  projectId: string
  initialJobId?: string | null
  hasApiKey: boolean
}

export default function JobPoller({ projectId, initialJobId, hasApiKey }: Props) {
  const [job, setJob] = useState<JobState | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      if (!res.ok) return
      const data = await res.json()
      setJob(data)
      return data.status
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!job?.id) return
    if (job.status === 'complete' || job.status === 'failed') return

    const interval = setInterval(async () => {
      const status = await pollJob(job.id)
      if (status === 'complete' || status === 'failed') {
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [job?.id, job?.status, pollJob])

  useEffect(() => {
    if (initialJobId) {
      setJob({ id: initialJobId, status: 'queued' })
      pollJob(initialJobId)
    }
  }, [initialJobId, pollJob])

  const triggerJob = async () => {
    setError('')
    setGenerating(true)

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const msg = data.error || 'Failed to start job'
        if (
          typeof msg === 'string' &&
          (msg.includes('Claude API key') || msg.includes('API key not configured'))
        ) {
          throw new Error(
            'Add your Claude API key in Settings before generating. Open Settings → save your key, then try again.'
          )
        }
        throw new Error(msg)
      }

      const { jobId } = await res.json()
      setJob({ id: jobId, status: 'queued' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start render')
    } finally {
      setGenerating(false)
    }
  }

  const isRunning = job && !['complete', 'failed'].includes(job.status)

  const keyGate = !hasApiKey

  return (
    <div className="space-y-6">
      {keyGate && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-100 mb-1">Claude API key required</p>
          <p className="text-amber-100/75 mb-3">
            Save your Anthropic API key in Settings to generate demo videos. Your key is encrypted and never logged.
          </p>
          <Link
            href="/settings#api-key"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-[#E8621A] hover:bg-[#F5A623] text-white h-9 px-4 transition-colors"
          >
            Open Settings
          </Link>
        </div>
      )}

      {/* Generate button */}
      {(!job || job.status === 'failed') && !isRunning && (
        <div className="space-y-3">
          <Button
            onClick={() => triggerJob()}
            disabled={generating || keyGate}
            type="button"
            className="bg-[#E8621A] hover:bg-[#F5A623] text-white gap-2 h-11 px-6 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {generating ? 'Starting...' : 'Generate video'}
          </Button>
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> {error}
            </p>
          )}
          {error && error.includes('Settings') && (
            <Link
              href="/settings#api-key"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-white/20 text-white/90 hover:bg-white/5 h-9 px-4"
            >
              Go to Settings
            </Link>
          )}
        </div>
      )}

      {/* Job progress */}
      {job && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {job.status === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : job.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Loader2 className="w-5 h-5 text-[#E8621A] animate-spin" />
              )}
              <span className="text-sm font-medium text-white">
                {STATUS_LABELS[job.status]}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                job.status === 'complete'
                  ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10'
                  : job.status === 'failed'
                  ? 'border-red-500/20 text-red-400 bg-red-500/10'
                  : 'border-[#E8621A]/20 text-[#E8621A] bg-[#E8621A]/10'
              }`}
            >
              {job.status}
            </Badge>
          </div>

          {job.status !== 'failed' && (
            <div className="relative pt-1">
              <Progress value={getProgress(job.status)} className="h-1.5 bg-white/5" />
              <div className="absolute inset-0 flex items-center justify-between text-[10px] text-white/30 font-medium px-1">
                <span>{getProgress(job.status)}%</span>
              </div>
            </div>
          )}

          {job.status === 'failed' && job.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
              <strong>Error:</strong> {job.error}
            </div>
          )}
        </div>
      )}

      {/* Video player */}
      {job?.status === 'complete' && job.videoUrl && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
            <video
              src={job.videoUrl}
              controls
              autoPlay
              loop
              className="w-full aspect-video bg-black"
            >
              <source src={job.videoUrl} type="video/mp4" />
            </video>
          </div>

          <a href={job.videoUrl} download="demo.mp4" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="border-white/20 text-white/80 hover:text-white hover:border-white/40 gap-2"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </Button>
          </a>
        </div>
      )}

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        title="Refine & regenerate — Pro waitlist"
        description="Tweaking pacing, layout, or re-running generation with notes is a Pro feature. Join the waitlist and we’ll let you know when it’s available."
      />

      {/* Regenerate → waitlist (beta) */}
      {job && (job.status === 'complete' || job.status === 'failed') && (
        <div className="border-t border-white/[0.06] pt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
            <RefreshCw className="h-4 w-4" />
            Refine your demo
          </p>
          <p className="mb-4 text-sm text-white/40">
            Regeneration with custom notes isn&apos;t included in the beta. Join the Pro waitlist to
            get early access.
          </p>
          <Button
            type="button"
            onClick={() => setWaitlistOpen(true)}
            className="bg-[#E8621A] text-white hover:bg-[#F5A623]"
          >
            Join waitlist to regenerate
          </Button>
        </div>
      )}
    </div>
  )
}
