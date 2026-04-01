'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { WAITLIST_PRICE_OPTIONS } from '@/lib/waitlist-options'
import { JoinDiscordButton } from '@/components/JoinDiscordButton'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}

export default function WaitlistDialog({
  open,
  onOpenChange,
  title = 'Join the Pro waitlist',
  description = 'Unlimited projects, refinements, and priority rendering — tell us you’re interested.',
}: Props) {
  const [email, setEmail] = useState('')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setEmail('')
    setSelectedPrice('')
    setSuccess(false)
    setError('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !selectedPrice) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), willingToPay: selectedPrice }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join waitlist')
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border border-white/[0.12] bg-[#0f0f0f] p-6 text-white sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg text-white">{title}</DialogTitle>
          <DialogDescription className="text-center text-white/50">{description}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-emerald-400">
            <CheckCircle className="h-10 w-10 shrink-0" />
            <p>You&apos;re on the list. We&apos;ll be in touch.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="waitlist-dialog-email" className="text-white/70">
                Email
              </Label>
              <Input
                id="waitlist-dialog-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 border-white/10 bg-white/[0.06] text-white placeholder:text-white/25"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">How much would you pay per month?</Label>
              <div className="flex flex-wrap gap-2">
                {WAITLIST_PRICE_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPrice(p)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                      selectedPrice === p
                        ? 'border-[#E8621A] bg-[#E8621A] text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25 hover:text-white/90'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button
                type="submit"
                disabled={loading || !email.trim() || !selectedPrice}
                className="h-11 flex-1 bg-[#E8621A] text-white hover:bg-[#F5A623] sm:min-w-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join waitlist'}
              </Button>
              <JoinDiscordButton
                size="lg"
                buttonClassName="h-11 w-full shrink-0 border-white/[0.12] sm:w-auto sm:min-w-[9.5rem]"
              />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
