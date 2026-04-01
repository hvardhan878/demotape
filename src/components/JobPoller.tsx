'use client'

import { useState, useEffect, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

type JobStatus = 'queued' | 'generating' | 'rendering' | 'uploading' | 'complete' | 'failed'

type JobState = {
  id: string
  status: JobStatus
  error?: string
  videoUrl?: string
}

const STATUS_STEPS: JobStatus[] = ['queued', 'generating', 'rendering', 'uploading', 'complete']

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Job queued...',
  generating: 'Claude is writing your component...',
  rendering: 'Playwright is recording...',
  uploading: 'Uploading to storage...',
  complete: 'Your demo is ready!',
  failed: 'Render failed',
}

const getProgress = (status: JobStatus): number => {
  const idx = STATUS_STEPS.indexOf(status)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100)
}

type Props = {
  projectId: string
  isPro: boolean
  initialJobId?: string | null
  onNewJob?: (jobId: string) => void
}

export default function JobPoller({ projectId, isPro, initialJobId, onNewJob }: Props) {
  const [job, setJob] = useState<JobState | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reprompt, setReprompt] = useState('')
  const [reprompting, setReprompting] = useState(false)
  const [error, setError] = useState('')

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

  // Start polling when we have a jobId
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

  // Load initial job if provided
  useEffect(() => {
    if (initialJobId) {
      setJob({ id: initialJobId, status: 'queued' })
      pollJob(initialJobId)
    }
  }, [initialJobId, pollJob])

  const triggerJob = async (repromptText?: string) => {
    setError('')
    if (repromptText !== undefined) {
      setReprompting(true)
    } else {
      setGenerating(true)
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          reprompt: repromptText || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start job')
      }

      const { jobId } = await res.json()
      const newJob: JobState = { id: jobId, status: 'queued' }
      setJob(newJob)
      setReprompt('')
      onNewJob?.(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start render')
    } finally {
      setGenerating(false)
      setReprompting(false)
    }
  }

  const isRunning = job && !['complete', 'failed'].includes(job.status)

  return (
    <div className="space-y-6">
      {/* Generate button (shown when no job or job failed) */}
      {(!job || job.status === 'failed') && !isRunning && (
        <div className="space-y-3">
          <Button
            onClick={() => triggerJob()}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 h-11 px-6"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? 'Starting...' : 'Generate Demo Video'}
          </Button>
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>
      )}

      {/* Job progress */}
      {job && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {job.status === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : job.status === 'failed' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              )}
              <span className="text-sm font-medium text-white">
                {STATUS_LABELS[job.status]}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                job.status === 'complete'
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : job.status === 'failed'
                  ? 'border-red-500/40 text-red-400 bg-red-500/10'
                  : 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
              }`}
            >
              {job.status === 'queued' && <Clock className="w-3 h-3 mr-1" />}
              {job.status}
            </Badge>
          </div>

          {job.status !== 'failed' && (
            <Progress
              value={getProgress(job.status)}
              className="h-1.5 bg-white/10"
            />
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
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
            <video
              src={job.videoUrl}
              controls
              autoPlay
              loop
              className="w-full aspect-video bg-black"
            >
              <source src={job.videoUrl} type="video/webm" />
            </video>

            {/* Watermark overlay */}
            {!isPro && (
              <div className="absolute bottom-3 right-3 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                Made with DemoForge
              </div>
            )}
          </div>

          {/* Download */}
          <div className="flex items-center gap-3">
            <a href={job.videoUrl} download="demo.webm" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="border-white/20 text-white/80 hover:text-white hover:border-white/40 gap-2"
              >
                <Download className="w-4 h-4" />
                Download WebM
              </Button>
            </a>
            {!isPro && (
              <span className="text-xs text-white/30">
                Upgrade to Pro to remove watermark
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reprompt (shown after complete or failed) */}
      {job && (job.status === 'complete' || job.status === 'failed') && (
        <div className="border-t border-white/[0.06] pt-6">
          <p className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refine your demo
          </p>
          <div className="flex gap-2">
            <Input
              value={reprompt}
              onChange={(e) => setReprompt(e.target.value)}
              placeholder='e.g. "Make it slower", "Add a third screen showing the dashboard"'
              className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reprompt.trim() && !reprompting) {
                  triggerJob(reprompt.trim())
                }
              }}
            />
            <Button
              onClick={() => triggerJob(reprompt.trim())}
              disabled={reprompting || !reprompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
            >
              {reprompting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Regenerate'}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-2 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
