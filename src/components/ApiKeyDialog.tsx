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
import { Key, Loader2, AlertCircle } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after key is saved successfully (before dialog closes). */
  onSaved: () => void
}

export default function ApiKeyDialog({ open, onOpenChange, onSaved }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/session/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeApiKey: apiKey.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save API key')
      }
      setApiKey('')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
      }}
    >
      <DialogContent
        className="sm:max-w-md border border-white/[0.12] bg-[#0f0f0f] p-6 text-white shadow-2xl"
        showCloseButton
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8621A] to-[#F5A623]">
            <Key className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-lg text-white">Add your Claude API key</DialogTitle>
          <DialogDescription className="text-center text-white/50">
            demotape uses your key to generate the demo. It&apos;s encrypted and never logged.{' '}
            <a
              href="https://console.anthropic.com/account/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5A623] underline-offset-2 hover:underline"
            >
              Get a key from Anthropic
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="modal-claude-key" className="text-white/70">
              API key
            </Label>
            <Input
              id="modal-claude-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="h-11 border-white/10 bg-white/[0.06] text-white placeholder:text-white/25 focus-visible:border-[#E8621A]"
              required
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="h-11 w-full bg-gradient-to-r from-[#E8621A] to-[#F5A623] text-white hover:opacity-95"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
